import { GRAPHQL_SERVER_PORT } from '../utils/constant.mjs';
import { ApolloServer, gql } from 'apollo-server';

const typeDefs = gql`
 type Query {
  greeting: String
 }
`;

const resolvers = {
 Query: {
  greeting: () => 'Hello GraphQL world!👋',
 },
};

export class File {
 constructor() {
  const server = new ApolloServer({ typeDefs, resolvers });
  server
   .listen({ port: GRAPHQL_SERVER_PORT })
   .then(() => console.log(`Server running at ${GRAPHQL_SERVER_PORT}`));
 }
}
