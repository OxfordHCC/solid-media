This document provides a documentation of the access control use case arising from the solid-media application. It is written by references to the [Solid Web Access Control (WAC) Protocol](https://solid.github.io/web-access-control-spec/) Editor’s Draft 2022-02-07, which was accessed on 21 February 2022.


During the implementation of our solid-media application, a number of simple access control scenarios were raised by the EWADA team members, who acted as test users of the MVP. We are the in process of implementing all the identified access control requirements by following the WAC protocol. At the same time, we thought these use cases may also be useful for the WAC editors.


# Allowing a user to access their own movie data

This is the simplest scenario we have.

We anticipate, when a user created a _movie_ using our app, then the _movie_ resource will be appended to a _movies_ container, stored in the user's solid pod. The user should be given a read, write, append and control access to each _movie_ resource that is created by the app.


@@TODO: identify how the association between a _user_ and a _movie_ resource is built.

# Allowing a user to acccess their friends' movie data

A user can add a friend through their WebID in our app. As a result, the user can then see their friend's list of movies.

This is a simplified ACL scenario because in real application, we would anticipate the user neeeds to _request_ access to their friends' movie list and be _granted_ with this access.


@@TODO Currently, the access to friends' movie list works as all test users define their _movies_ to be publically accessible. This will need to be updated.


# Allowing a user to control who can access their movie data

Once a user decides to *control* who may see their movies, then the implementation of the above function will need to be updated. A user won't be able to see a friend's movie lists unless their friend has granted them the access.

@@TODO: this access control has not yet been implemented and tested yet.


