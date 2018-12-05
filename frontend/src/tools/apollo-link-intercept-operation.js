import { ApolloLink } from 'apollo-link';


export class InterceptOperationLink extends ApolloLink {
    constructor(interceptMap={}) {
        super();
        this.interceptMap = interceptMap;
    }

    request(operation, forward) {
        let intercepts = [];

        // for (let def of operation.query.definitions) {
        //     if (def.operation === 'mutation' && this.interceptMap.Mutation) {
        //         for (let selection of def.selectionSet.selections) {
        //             if (this.interceptMap.Mutation[selection.name.value]) {
        //                 intercepts.push((operation, innerForward) => {
        //                     return this.interceptMap.Mutation[selection.name.value](operation, selection, innerForward);
        //                 });
        //             }
        //         }
        //     } else if (def.operation === 'query' && this.interceptMap.Query) {
        //         for (let selection of def.selectionSet.selections) {
        //             if (this.interceptMap.Query[selection.name.value]) {
        //                 intercepts.push((operation, innerForward) => {
        //                     return this.interceptMap.Query[selection.name.value](operation, selection, innerForward);
        //                 });
        //             }
        //         }
        //     } else if (def.operation === 'subscription' && this.interceptMap.Subscription) {
        //         for (let selection of def.selectionSet.selections) {
        //             if (this.interceptMap.Subscription[selection.name.value]) {
        //                 intercepts.push((operation, innerForward) => {
        //                     return this.interceptMap.Query[selection.name.value](operation, selection, innerForward);
        //                 });
        //             }
        //         }
        //     }
        // }

        for (let def of operation.query.definitions) {
            let queryType = def.operation[0].toUpperCase() + def.operation.slice(1);
            if (this.interceptMap[queryType]) {
                for (let selection of def.selectionSet.selections) {
                    if (this.interceptMap[queryType][selection.name.value]) {
                        intercepts.push((operation, innerForward) => {
                            return this.interceptMap.Mutation[selection.name.value](operation, selection, innerForward);
                        });
                    }
                }
            }
        }

        let index = 0;

        return (function innerForward(operation) {
            let intercept = intercepts[index++];
            if (intercept)
                return intercept(operation, innerForward);
            else
                return forward(operation);
        })(operation);
    }
};
