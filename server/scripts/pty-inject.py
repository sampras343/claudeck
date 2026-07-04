#!/usr/bin/env python3
"""Inject input into a process's terminal via its PTY master.

Modes:
  pty-inject.py <pid> --raw <text>        Write text + newline (for permission y/n, free-text)
  pty-inject.py <pid> --select <index>    Arrow-down <index> times + Enter (for TUI option selectors)
  pty-inject.py <pid> --select <index> --other-text <text>
                                          Navigate to "Other" option, press Enter, then type text + Enter

Uses pidfd_getfd to duplicate the PTY master from the terminal emulator.
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
        os.write(fd, (text + "\n").encode())
    finally:
        os.close(fd)


def inject_select(pid: int, index: int, other_text: str | None = None):
    fd = get_master_fd(pid)
    try:
        # Navigate down to the desired option
        for _ in range(index):
            os.write(fd, ARROW_DOWN)
            time.sleep(0.03)

        # Press Enter to select
        os.write(fd, ENTER)

        # If "Other" mode, wait for the text input to appear, then type
        if other_text is not None:
            time.sleep(0.15)
            os.write(fd, (other_text + "\n").encode())
    finally:
        os.close(fd)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("pid", type=int)
    parser.add_argument("--raw", type=str, default=None)
    parser.add_argument("--select", type=int, default=None)
    parser.add_argument("--other-text", type=str, default=None)
    args = parser.parse_args()

    try:
        if args.select is not None:
            inject_select(args.pid, args.select, args.other_text)
        elif args.raw is not None:
            inject_raw(args.pid, args.raw)
        else:
            parser.error("Must specify --raw or --select")
        print("OK")
    except Exception as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
