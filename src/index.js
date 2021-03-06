import commandLineArgs from 'command-line-args'
import { cliOptions } from './cliOptions'
import { ApolloServer, gql } from 'apollo-server'
import { merge } from 'lodash'
import DataLoader from "dataloader";
import GraphQLJSON from 'graphql-type-json';
import { URL, DateTime, EmailAddress } from '@okgrow/graphql-scalars';

import { batchFaker } from './request'
import { typeDef as Occurrence, resolvers as occurrenceResolvers, occurrenceByKey } from './types/occurrence.js';
import { typeDef as Dataset, resolvers as datasetResolvers, datasetByKey } from './types/dataset.js';
import { typeDef as Taxon, resolvers as taxonResolvers, taxonByKey, formatedScientificNameByKey } from './types/taxon.js';
import { typeDef as TaxonSubTypes, resolvers as taxonSubTypesResolvers } from './types/taxonSubTypes';
import { typeDef as Organization, resolvers as organizationResolvers, organizationByKey } from './types/organization.js';
import { typeDef as Contact } from './types/misc/contact';
import { typeDef as Identifier } from './types/misc/identifier';
import { typeDef as Endpoint } from './types/misc/endpoint';
import { typeDef as MachineTag } from './types/misc/machineTag';
import { typeDef as Tag } from './types/misc/tag';
import { typeDef as Comment } from './types/misc/comment';
import { enumTypeDefs } from './types/enums';

const options = commandLineArgs(cliOptions)

async function setupServer() {
  const enumsSchema = await enumTypeDefs();

  const typeDefs = gql`
    scalar URL
    scalar DateTime
    scalar EmailAddress
    scalar JSON

    ${enumsSchema}

    type Query {
      _empty: String
    }
  `;

  const resolvers = {
    Query: {},
    JSON: GraphQLJSON, // last resort type for unstructured data
    URL, DateTime, EmailAddress, 
  };

  const getLoaders = () => ({
    taxonByKey: new DataLoader(batchFaker(taxonByKey), {batch: false}), // our APIs do not support batch querying by IDs
    datasetByKey: new DataLoader(batchFaker(datasetByKey), {batch: false}), // our APIs do not support batch querying by IDs
    occurrenceByKey: new DataLoader(batchFaker(occurrenceByKey), {batch: false}), // our APIs do not support batch querying by IDs
    organizationByKey: new DataLoader(batchFaker(organizationByKey), {batch: false}), // our APIs do not support batch querying by IDs
    formatedScientificNameByKey: new DataLoader(batchFaker(formatedScientificNameByKey), {batch: false}), // our APIs do not support batch querying by IDs
  })

  const server = new ApolloServer({
    typeDefs: [typeDefs, Occurrence, Dataset, Taxon, TaxonSubTypes, Organization, Contact, Identifier, Endpoint, MachineTag, Tag, Comment],
    resolvers: merge(resolvers, occurrenceResolvers, datasetResolvers, taxonResolvers, taxonSubTypesResolvers, organizationResolvers),
    context: () => ({
      loaders: getLoaders()
    })
  });

  // This `listen` method launches a web-server.  Existing apps
  // can utilize middleware options, which we'll discuss later.
  server.listen({ port: options.port || 4000 }).then(({ url }) => {
    console.log(`🚀  Server ready at ${url}`);
  });
}

setupServer();