/* eslint-disable  @typescript-eslint/no-unsafe-member-access */
/* eslint-disable  @typescript-eslint/no-unsafe-assignment */
/* eslint-disable  @typescript-eslint/no-explicit-any */
/* eslint-disable  @typescript-eslint/no-unsafe-call */
/* eslint-disable  @typescript-eslint/no-unsafe-return */

import * as core from '@actions/core'

export const getTransferLabel = (gitHubIssue: GitHubIssue): GitHubLabel => {
  const inputRouterPrefix: string = core.getInput('router_prefix')
  const transferLabel = gitHubIssue.labels.nodes.find((label: GitHubLabel) =>
    label.name.startsWith(inputRouterPrefix)
  )
  if (transferLabel === undefined) {
    core.info(`Could not find a transfer label attached to the issue`)
    return { id: '', name: '' }
  }

  core.info(
    `Transfer label is: ${transferLabel.name}, with ID: ${transferLabel.id}`
  )
  return transferLabel
}
