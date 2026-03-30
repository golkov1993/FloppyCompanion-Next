// SPDX-License-Identifier: GPL-2.0
#define _GNU_SOURCE

#include <errno.h>
#include <inttypes.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/prctl.h>

#ifndef PR_GET_FK_FEATURE
#define PR_GET_FK_FEATURE            0x46504b01
#define PR_FK_FEATURE_SUPPORTED      (1U << 0)
#define PR_FK_FEATURE_BY_INDEX       (1U << 1)
#define FK_FEATURE_NAME_LEN          32

struct prctl_fk_feature_info {
	uint32_t feature_id;
	uint32_t flags;
	uint64_t value;
	char name[FK_FEATURE_NAME_LEN];
};
#endif

static int enum_feature_info(uint32_t index, struct prctl_fk_feature_info *info)
{
	memset(info, 0, sizeof(*info));
	if (prctl(PR_GET_FK_FEATURE, (unsigned long)index, (unsigned long)info,
		  (unsigned long)PR_FK_FEATURE_BY_INDEX,
		  0UL))
		return -1;

	return 0;
}

static int get_feature_info(uint32_t id, struct prctl_fk_feature_info *info)
{
	memset(info, 0, sizeof(*info));
	if (prctl(PR_GET_FK_FEATURE, (unsigned long)id, (unsigned long)info,
		  0UL, 0UL))
		return -1;

	return 0;
}

static int lookup_feature(const char *arg, struct prctl_fk_feature_info *info)
{
	char *end;
	unsigned long value;
	uint32_t index = 0;

	errno = 0;
	value = strtoul(arg, &end, 0);
	if (!errno && arg[0] && !*end && value <= UINT32_MAX) {
		while (!enum_feature_info(index, info)) {
			if (info->feature_id == (uint32_t)value)
				return 0;
			index++;
		}
		errno = ENOENT;
		return -1;
	}

	index = 0;
	while (!enum_feature_info(index, info)) {
		if (!strcmp(info->name, arg))
			return 0;
		index++;
	}

	errno = ENOENT;
	return -1;
}

static void usage(const char *argv0)
{
	fprintf(stderr,
		"Usage:\n"
		"  %s get <feature-name|feature-id>\n"
		"  %s list\n",
		argv0, argv0);
}

static int cmd_get(const char *feature_arg)
{
	struct prctl_fk_feature_info info;

	if (lookup_feature(feature_arg, &info)) {
		fprintf(stderr, "feature not found: %s\n", feature_arg);
		return 1;
	}

	if (get_feature_info(info.feature_id, &info)) {
		fprintf(stderr, "prctl failed for feature %s (%" PRIu32 "): %s\n",
			info.name, info.feature_id, strerror(errno));
		return 1;
	}

	if (!(info.flags & PR_FK_FEATURE_SUPPORTED)) {
		fprintf(stderr, "feature %s (%" PRIu32 ") not supported\n",
			info.name, info.feature_id);
		return 2;
	}

	printf("%s=%" PRIu64 "\n", info.name, info.value);

	return 0;
}

static int cmd_list(void)
{
	uint32_t index = 0;

	for (;;) {
		struct prctl_fk_feature_info info;

		if (enum_feature_info(index, &info)) {
			if (errno == ENOENT)
				break;
			fprintf(stderr, "feature enumeration failed at %" PRIu32 ": %s\n",
				index, strerror(errno));
			return 1;
		}

		if (info.flags & PR_FK_FEATURE_SUPPORTED)
			printf("%s=%" PRIu64 "\n", info.name, info.value);

		index++;
	}

	return 0;
}

int main(int argc, char **argv)
{
	if (argc != 3 && argc != 2) {
		usage(argv[0]);
		return 1;
	}

	if (!strcmp(argv[1], "get")) {
		if (argc != 3) {
			usage(argv[0]);
			return 1;
		}
		return cmd_get(argv[2]);
	}

	if (!strcmp(argv[1], "list")) {
		if (argc != 2) {
			usage(argv[0]);
			return 1;
		}
		return cmd_list();
	}

	usage(argv[0]);
	return 1;
}
