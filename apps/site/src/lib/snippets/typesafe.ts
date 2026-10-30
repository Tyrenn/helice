import { db } from './schema.ts';

// @ts-expect-error : there is no "pots" table
db.select('pots');

// @ts-expect-error : "views" is a number
db.select('post').where({ views: 'many' });

// @ts-expect-error : "email" belongs to user, which was never joined
db.select('post').field('email');

// @ts-expect-error : "nam" is not a column of user
db.insert('user').values({ nam: 'Alice' });

// @ts-expect-error : only "id" is allowed at call time
db.delete('user').prepare({ where: { user: ['id'] } })({ where: { name: 'Alice' } });
