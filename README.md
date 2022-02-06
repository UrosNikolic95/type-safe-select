# Usage

Properly define entities:

Example:

    export class Entity1{
        @PrimaryGeneratedColumn()
        id: number

        // column
        @Column()
        field1: number

        // association
        @ManyToOne(() => Entity2, (el)=>el.return_field_1)
        field2: Entity2

        // association
        @OneToMany(() => Entity3, (el)=>el.return_field_2)
        field2: Entity3

        // association
        @OneToOne(() => Entity4, (el)=>el.return_field_3)
        field3: Entity4
    }

For TypeORM repo:

    repo:Repository<Entity>

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

Example of getter:

    (el)=> el.<association_1>.<association_2>.<column>

Last field of getter is column, and not association.

Getter fields that are not the last one are associations, and not getters.

# Why?

1. reason:

   If you use rename functionality (F2) of Visual Code Editor to rename field of an class of interface, it will not take strings into consideration. If some strings have parts that need to be matching those fields you will need to manualy change those parts of strings. Solution? Instead of using strings, use different types of writing down the query which will be updated by rename functionality (F2).

2. reason:

   When you use query.getRawMany() the return type is unknown[], so you have to cast it. That requires to define your interface and make sure it maches fields specified in query. This code does not require that, because return type is defined in manner that it is being picked up from passed parameters.
