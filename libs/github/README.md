# @sidelines/github

Package of GitHub API based features for Sidelines.dev.

## GraphQL codegen

The [./queries](./queries) dir contains `.graphql` files to develop against
GitHub's GraphQL API with schema validation and codegen.

Run `bun graphql` to generate a minified GraphQL query string and a TypeScript type
for the query's variables. The `.graphql` filename determines where in the `src`
directory the codegen output is written to.

### Excluding queries from codegen

Prepending a `.graphql` file in the queries directory with `_` will exclude it from codegen.
Within a processed `.graphql` file prepending a query name with `_` will exclude the query
from that codegen's output.
