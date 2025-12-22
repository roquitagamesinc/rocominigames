import { Client, Databases } from 'appwrite';

export const client = new Client();

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const project = process.env.NEXT_PUBLIC_APPWRITE_PROJECT;

if (endpoint && project) {
    client
        .setEndpoint(endpoint)
        .setProject(project);
}

export const databases = new Databases(client);
export const APPWRITE_DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
export const APPWRITE_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ID!;
export const APPWRITE_FOOD_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_FOOD_COLLECTION_ID!;
export const APPWRITE_MESSAGES_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID!;
