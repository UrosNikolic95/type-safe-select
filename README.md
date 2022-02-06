# Usage

For TypeORM repo:

    const repo:Repository<Entity>

    const result = await TypeSafeSelect(repo, {
        name1: (el) => el.name,
        name2: (el) => el.test1s.name, // requires associacion test1s
        name3: (el) => el.test1s.test2.name, // requires associations  test1s and test2
        id: (el) => el.test1s.id, // requires associacion test1s
    }),

Result will have type:

    const result: {
        name1: typeof el.name,
        name2: typeof el.test1s.name,
        name3: typeof el.test1s.test2.name,
        id: typeof el.test1s.id
        }[]

Last field of getter is column, and not association.

Getter fields that are not the last one are associations, and not getters.

    (el)=> el.<association_1>.<association_2>.<column>
