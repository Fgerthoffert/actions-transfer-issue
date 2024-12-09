<!-- markdownlint-disable MD041 -->
<p align="center">
  <img alt="ZenCrepesLogo" src="docs/zencrepes-logo.png" height="140" />
  <h2 align="center">Transfer issues with labels</h2>
  <p align="center">A GitHub Action to transfer an issue between repositories using
   labels. Supports transferring issues from private to public repositories.</p>
</p>

---

<div align="center">

[![GitHub Super-Linter](https://github.com/fgerthoffert/actions-transfer-issue/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/fgerthoffert/actions-transfer-issue/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/fgerthoffert/actions-transfer-issue/actions/workflows/check-dist.yml/badge.svg)](https://github.com/fgerthoffert/actions-transfer-issue/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/fgerthoffert/actions-transfer-issue/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/fgerthoffert/actions-transfer-issue/actions/workflows/codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

</div>

---

# About

The goal of this GitHub Action is to facilitate the transfer of issues between
repositories of the same organization.

In short, attaching a label `transfer:sandbox` will transfer an issue from its
current repositories to the sandbox repository.

This issue makes it possible to overcome the two major limitations of GitHub UI
when it comes to transferring issues between repositories:

- Maintaining issue labels during the transfer
- Transferring from private to public repositories

These operations are possible with this action.

# Transferring from Private to Public repositories

Transferring issues from private to public repositories is not supported by
GitHub by default
([see related post here](https://github.com/orgs/community/discussions/21979#discussioncomment-4800558)).

Nevertheless the community has found a way to go around that limitation, process
that can be entirely automated.

When `allow_private_public_transfer` is enabled, and if a request is made to
transfer to an issue from a private repository to a public one, a temporary
private repository will be automatically created, the issue will be transferred
to that repository which will then be made public. Finally after the transfer,
the repository will be deleted.

This manipulation requires your Personal API Token to have the `delete_repo`
scope.

The name of that temporary repository is composed of a stringified date to which
a random 5 characters string is appended.

This option is disabled by default.

# Usage

This action is meant at being started manually (i.e. to instantly push a new
label) and on schedule (i.e. to regularly check that all labels with the same
name have the same color and description).

```yaml
name: Sync Labels

on:
  issues:
    types:
      - labeled

jobs:
  transfer:
    runs-on: ubuntu-latest
    steps:
      - name: Transfer issue
        # Replace main by the release of your choice
        uses: fgerthoffert/actions-transfer-issue@main
        with:
          token: YOUR_TOKEN
          create_labels_if_missing: true
```

# :gear: Configuration

## Input Parameters

The following input parameters are available:

| Parameter                     | Default   | Description                                                                                                                 | Required |
| ----------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------- | -------- |
| token                         |           | A GitHub Personal API Token                                                                                                 | true     |
| router_prefix                 | transfer: | Label prefix to identify where to transfer the issue (for example, "transfer:sandbox")                                      | true     |
| allow_private_public_transfer | false     | Allow issues to be transferred from private to public repositories.                                                         |          |
| create_labels_if_missing      | true      | Create labels in the destination repository if missing                                                                      |          |
| github_issue_id               |           | When providing a GitHub Issue ID (GraphQL ID) the action will use that ID instead of the one provided in the event payload. | false    |

## Outputs

The following outputs are available:

| Name     | Description                  |
| -------- | ---------------------------- |
| issue_id | The ID of the migrated issue |

# How to contribute

- Fork the repository
- npm install
- Rename .env.example into .env
- Update the INPUT\_ variables
- Do your changes
- npx local-action . src/main.ts .env
- npm run bundle
- npm test
- PR into this repository, detailing your changes

More details about GitHub TypeScript action are
[available here](https://github.com/actions/typescript-action)
