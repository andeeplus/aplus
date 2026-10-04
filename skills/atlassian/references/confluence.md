# Confluence

Confluence holds the long-lived documents: concepts, specs, ADRs and RFCs. Write them with [senior-technical-writer](../../senior-technical-writer/SKILL.md), and shape each like the space's existing pages of the same kind.

```sh
atlassian-cli -f json confluence search cql 'space = <KEY> AND title ~ "<words>"'   # find a page first
atlassian-cli confluence page get <page id> --body-only                            # read it
atlassian-cli -f json confluence space get <KEY>                                   # the space id that page create needs
atlassian-cli -f json confluence page create --space <space id> --parent <page id> --title "<title>" --body <scratch>/page.html
atlassian-cli confluence page update <page id> --body <scratch>/page.html --message "<what changed>"
atlassian-cli confluence page add-label <page id> <adr|rfc|spec>
atlassian-cli -f json confluence page comments <page id>
atlassian-cli confluence page add-comment <page id> "<text>" --parent <comment id>
```

- **Body:** a file in Confluence storage format, which is XHTML: `<h2>`, `<p>`, `<ul>`, `<table>`. A code block is `<ac:structured-macro ac:name="code"><ac:parameter ac:name="language">ts</ac:parameter><ac:plain-text-body><![CDATA[…]]></ac:plain-text-body></ac:structured-macro>`.
- **Update** from the current body: read it, edit it, write it back whole.
