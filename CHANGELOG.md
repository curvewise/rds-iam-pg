# Changelog

## 2.0.0

Initial public release.

### BREAKING CHANGES

- Move `pg` from dependencies to peer dependencies.

## 1.0.1

- Suppress engine warning when installing in later version of Node.

## 1.0.0

- Allow overriding the region when invoking `loadConfig()`, which is useful
  for invoking a Lambda client with that `AWS.Config` object.
