interface GitHubLabel {
  id: string
  name: string
}

interface GitHubIssue {
  id: string
  number: string
  url: string
  title: string
  state: string
  updatedAt: string
  repository: GitHubRepository
  projectItems: {
    totalCount: number
    nodes: GitHubProjectItem[]
  }
  labels: {
    totalCount: number
    nodes: GitHubLabel[]
  }
  timelineItems: {
    totalCount: number
  }
  participants: {
    totalCount: number
  }
  projectItems: {
    totalCount: number
  }
  subIssues: {
    totalCount: number
  }
  comments: {
    totalCount: number
  }
}

interface GitHubRepository {
  id: string
  node_id: string
  name: string
  isPrivate: boolean
  visibility: string
  owner: {
    login: string
  }
  issues: {
    totalCount: number
  }
}
