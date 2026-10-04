# Setup

```sh
brew install omar16100/atlassian-cli/atlassian-cli   # or brew upgrade; atlassian-cli --version must print 0.10.0 or later
```

Create tokens at <https://id.atlassian.com/manage-profile/security/api-tokens>. They expire after 1 to 365 days. `auth login` prompts for the token, or reads `ATLASSIAN_API_TOKEN`.

| Product             | Token                                                                                                                                                                                       | Log in                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Bitbucket           | API token for Bitbucket with `read:repository`, `read:pullrequest`, `write:pullrequest`, `read:pipeline`, `read:user`; add `write:repository` to push over HTTPS, `write:pipeline` to rerun | `atlassian-cli auth login --profile <p> --bitbucket --email <email> --workspace <ws>`            |
| Jira and Confluence | Classic API token: it carries your own permissions                                                                                                                                          | `atlassian-cli auth login --profile <p> --base-url https://<site>.atlassian.net --email <email>` |

A token's scopes are fixed when it is created: to add one, create a new token and log in again. Each scope above ends in `:bitbucket`. Check a login with `auth test`, and a Bitbucket token's scopes with `auth scopes`. For git over HTTPS, the username is `x-bitbucket-api-token-auth`.

**Permissions.** Bitbucket repository: Read to view, comment and approve; Write to push and merge. Jira project: Browse, Create, Link issues, Add comments, Transition. Confluence space: View, Add pages, Add comments.
