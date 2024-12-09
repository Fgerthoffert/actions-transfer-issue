/* eslint-disable  @typescript-eslint/no-unsafe-member-access */
/* eslint-disable  @typescript-eslint/no-unsafe-assignment */
/* eslint-disable  @typescript-eslint/no-explicit-any */
/* eslint-disable  @typescript-eslint/no-unsafe-call */

import * as core from '@actions/core'

export const deleteTemporaryRepository = async ({
  octokit,
  ownerLogin,
  repoName
}: {
  octokit: any
  ownerLogin: string
  repoName: string
}): Promise<GitHubRepository> => {
  core.debug(`Deleting temporary repository ${repoName}`)

  if (!repoName.includes('tmp-')) {
    core.setFailed('Repository name must include "tmp-"')
  }

  const tempRepoDelete = await octokit.request('DELETE /repos/{owner}/{repo}', {
    owner: ownerLogin,
    repo: repoName,
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })

  return tempRepoDelete.data
}

export default deleteTemporaryRepository
