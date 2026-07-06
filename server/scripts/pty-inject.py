#!/usr/bin/env python3
"""Inject input into a process's terminal via its PTY master.

Modes:
  pty-inject.py <pid> --raw <text>        Write text + newline (for permission y/n, free-text)
  pty-inject.py <pid> --select <index>    Arrow-down <index> times + Enter (for TUI option selectors)
  pty-inject.py <pid> --select <index> --other-text <text>
                                          Navigate to "Other" option, press Enter, then type text + Enter
  pty-inject.py <pid> --select-last       Deny the current permission prompt (sends 'n' key)
  pty-inject.py <pid> --allow             Send 'y' key to accept the current permission prompt
  pty-inject.py <pid> --deny              Send 'n' key to deny the current permission prompt

Uses pidfd_getfd to duplicate the PTY master from the terminal emulator.

Claude Code keybinding notes:
  The Confirmation context maps single keys to prompt actions:
    y -> confirm:yes (allow)    n -> confirm:no (deny)
    Enter -> confirm:yes        Escape -> confirm:no
    up/down -> confirm:previous/confirm:next (navigate options)
  Sending 'y' or 'n' is far more reliable than arrow-key navigation
  because escape sequences (\x1b[B) require precise timing to avoid
  being batched with subsequent keystrokes in React's event loop.
"""
import argparse
import ctypes
import fcntl
import os
import struct
import sys
import time

TIOCGPTN = 0x80045430
SYS_pidfd_open = 434
SYS_pidfd_getfd = 438

ARROW_DOWN = b"\x1b[B"
ENTER = b"\r"
ESCAPE = b"\x1b"

# Claude Code's ink TUI registers keybindings in a "Confirmation" context:
#   y -> confirm:yes (allow)
#   n -> confirm:no  (deny)
# These are single-character shortcuts that bypass arrow-key navigation entirely,
# avoiding the timing/batching issues that plague escape-sequence injection.
CONFIRM_YES = b"y"
CONFIRM_NO = b"n"

# Inter-keystroke delay must exceed one Node.js event-loop iteration so each
# key event lands in its own processInput → discreteUpdates batch.  Claude Code's
# ink framework reads stdin in a while(read()) loop; if two writes land between
# iterations they are concatenated, parsed, and dispatched inside a single React
# batch.  Value-based setState inside that batch would see stale closure state.
# 150 ms is conservative but reliable.
ARROW_DELAY = 0.15
# Extra pause before the final Enter so React commits the last arrow-down's
# state update before the Enter handler reads selectedIndex.
PRE_ENTER_DELAY = 0.20

libc = ctypes.CDLL("libc.so.6", use_errno=True)


def find_pty_master(target_pts_num: int) -> tuple[int, int] | None:
    for pid_entry in os.listdir("/proc"):
        if not pid_entry.isdigit():
            continue
        pid = int(pid_entry)
        fd_dir = f"/proc/{pid}/fd"
        try:
            for fd_name in os.listdir(fd_dir):
                try:
                    target = os.readlink(f"{fd_dir}/{fd_name}")
                    if target != "/dev/ptmx":
                        continue
                    with open(f"/proc/{pid}/fdinfo/{fd_name}") as f:
                        for line in f:
                            if line.startswith("tty-index:"):
                                tty_idx = int(line.split()[1])
                                if tty_idx == target_pts_num:
                                    return pid, int(fd_name)
                except (OSError, ValueError):
                    continue
        except OSError:
            continue
    return None


def dup_fd_from_process(holder_pid: int, holder_fd: int) -> int:
    pidfd = libc.syscall(SYS_pidfd_open, holder_pid, 0)
    if pidfd < 0:
        errno = ctypes.get_errno()
        raise OSError(errno, f"pidfd_open({holder_pid}): {os.strerror(errno)}")
    try:
        our_fd = libc.syscall(SYS_pidfd_getfd, pidfd, holder_fd, 0)
        if our_fd < 0:
            errno = ctypes.get_errno()
            raise OSError(errno, f"pidfd_getfd({holder_pid}, {holder_fd}): {os.strerror(errno)}")
        return our_fd
    finally:
        os.close(pidfd)


def get_master_fd(pid: int) -> int:
    slave_path = os.readlink(f"/proc/{pid}/fd/0")
    if not slave_path.startswith("/dev/pts/"):
        raise RuntimeError(f"fd/0 is not a PTY: {slave_path}")
    pts_num = int(slave_path.split("/")[-1])

    result = find_pty_master(pts_num)
    if result is None:
        raise RuntimeError(f"No PTY master found for {slave_path}")

    holder_pid, holder_fd = result
    master_fd = dup_fd_from_process(holder_pid, holder_fd)

    buf = fcntl.ioctl(master_fd, TIOCGPTN, struct.pack("I", 0))
    actual_pts = struct.unpack("I", buf)[0]
    if actual_pts != pts_num:
        os.close(master_fd)
        raise RuntimeError(f"PTY mismatch: expected pts/{pts_num}, got pts/{actual_pts}")

    return master_fd


def inject_raw(pid: int, text: str):
    fd = get_master_fd(pid)
    try:
        os.write(fd, text.encode() + b"\r")
    finally:
        os.close(fd)


def inject_select(pid: int, index: int, other_text: str | None = None):
    fd = get_master_fd(pid)
    try:
        if index == 0 and other_text is None:
            # First option: Enter alone suffices (no navigation needed).
            os.write(fd, ENTER)
        else:
            # Navigate down to the desired option.
            # Each arrow-down must land in a separate Node.js event-loop iteration
            # so that React's state update from the previous one is committed before
            # the next dispatch.
            for _ in range(index):
                os.write(fd, ARROW_DOWN)
                time.sleep(ARROW_DELAY)

            # Extra pause so the final arrow-down's state update is committed
            # before the Enter handler reads the selected index.
            time.sleep(PRE_ENTER_DELAY)
            os.write(fd, ENTER)

        # If "Other" mode, wait for the text input to appear, then type
        if other_text is not None:
            time.sleep(0.3)
            os.write(fd, (other_text + "\n").encode())
    finally:
        os.close(fd)


def inject_select_last(pid: int):
    """Navigate to the last option and press Enter.

    Sends enough arrow-downs to reach the bottom (ink doesn't wrap),
    with delays between each so React commits each state update.
    """
    fd = get_master_fd(pid)
    try:
        for _ in range(10):
            os.write(fd, ARROW_DOWN)
            time.sleep(ARROW_DELAY)
        time.sleep(PRE_ENTER_DELAY)
        os.write(fd, ENTER)
    finally:
        os.close(fd)


def inject_allow(pid: int):
    """Accept the current permission prompt — Enter on first (default) option."""
    fd = get_master_fd(pid)
    try:
        os.write(fd, ENTER)
    finally:
        os.close(fd)


def inject_deny(pid: int):
    """Deny the current permission prompt — navigate to last option and Enter."""
    inject_select_last(pid)


def inject_sigint(pid: int):
    """Send Ctrl+C (SIGINT) to cancel the current operation."""
    fd = get_master_fd(pid)
    try:
        os.write(fd, b"\x03")
    finally:
        os.close(fd)


def inject_exit(pid: int):
    """Send Ctrl+C then /exit to terminate the Claude session."""
    fd = get_master_fd(pid)
    try:
        os.write(fd, b"\x03")
        time.sleep(0.3)
        os.write(fd, b"/exit\n")
    finally:
        os.close(fd)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("pid", type=int)
    parser.add_argument("--raw", type=str, default=None)
    parser.add_argument("--select", type=int, default=None)
    parser.add_argument("--other-text", type=str, default=None)
    parser.add_argument("--select-last", action="store_true", help="Deny permission prompt (sends 'n' key)")
    parser.add_argument("--allow", action="store_true", help="Accept permission prompt (sends 'y' key)")
    parser.add_argument("--deny", action="store_true", help="Deny permission prompt (sends 'n' key)")
    parser.add_argument("--sigint", action="store_true", help="Send Ctrl+C")
    parser.add_argument("--exit", dest="do_exit", action="store_true", help="Send Ctrl+C + /exit")
    args = parser.parse_args()

    try:
        if args.allow:
            inject_allow(args.pid)
        elif args.deny:
            inject_deny(args.pid)
        elif args.select_last:
            inject_select_last(args.pid)
        elif args.sigint:
            inject_sigint(args.pid)
        elif args.do_exit:
            inject_exit(args.pid)
        elif args.select is not None:
            inject_select(args.pid, args.select, args.other_text)
        elif args.raw is not None:
            inject_raw(args.pid, args.raw)
        else:
            parser.error("Must specify --raw, --select, --select-last, --allow, --deny, --sigint, or --exit")
        print("OK")
    except Exception as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
