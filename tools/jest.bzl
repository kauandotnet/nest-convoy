load("@npm//jest-cli:index.bzl", _jest_test = "jest_test")

def jest_test_macro(name, srcs, config = "//:jest.config.js", deps = [], **kwargs):
    "A macro around the autogenerated jest_test rule"
    templated_args = [
        "--no-cache",
        "--no-watchman",
        "--ci",
    ]
    templated_args.extend(["--config", "$(rootpath %s)" % config])
    for src in srcs:
        templated_args.extend(["--runTestsByPath", "$(rootpaths %s)" % src])

    _jest_test(
        name = name,
        data = [config] + srcs + deps,
        templated_args = templated_args,
        **kwargs
    )

def jest_test(name, srcs, tags = ["unit"], **kwargs):
    native.filegroup(
        name = "%s_es5" % name,
        visibility = ["//visibility:private"],
        srcs = srcs,
        output_group = "es5_sources",
        tags = tags,
        testonly = 1,
    )

    jest_test_macro(
        name = name,
        srcs = ["%s_es5" % name],
        tags = tags,
        **kwargs
    )
