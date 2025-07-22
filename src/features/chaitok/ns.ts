import { Namespace as NamespaceFn } from 'rdflib';
import { Namespace } from 'rdflib/lib/factories/factory-types';

export const RDF: Namespace = NamespaceFn('http://www.w3.org/1999/02/22-rdf-syntax-ns#');
export const DC_TERMS: Namespace = NamespaceFn('http://purl.org/dc/terms/');
export const SCHEMA: Namespace = NamespaceFn('http://schema.org/');
export const FOAF: Namespace = NamespaceFn('http://xmlns.com/foaf/0.1/');
export const NS_CHAITOK: Namespace = NamespaceFn('urn:chaitok:core#');

export function forSolidClient(ns: Namespace): (name: string) => string {
    return (name: string): string => {
        return ns(name).value;
    };
}