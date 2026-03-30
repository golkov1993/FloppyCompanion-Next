# SPDX-License-Identifier: GPL-2.0

WARNINGS = -Wall -Wextra
CFLAGS ?= $(WARNINGS) -O2 -fPIE
LDFLAGS ?= -static-pie

all: fkfeatctl

fkfeatctl: fkfeatctl.c
	$(CC) $(CFLAGS) -o $@ $< $(LDFLAGS)

clean:
	$(RM) fkfeatctl
