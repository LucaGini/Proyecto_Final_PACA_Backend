// import passport from 'passport';
// import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
// import { orm } from '../shared/db/orm.js';
// import { User } from '../user/user.entity.js';
// import dotenv from 'dotenv';

// dotenv.config();

// const em = orm.em;

// passport.use(new GoogleStrategy({
//   clientID: process.env.GOOGLE_CLIENT_ID!,
//   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
//   callbackURL: process.env.GOOGLE_CALLBACK_URL!
// }, async (accessToken, refreshToken, profile, done) => {
//   try {
//     const existingUser = await em.findOne(User, { email: profile.emails![0].value });
    
//     if (existingUser) {
//       if (!existingUser.googleId) {
//         existingUser.googleId = profile.id;
//         await em.persistAndFlush(existingUser);
//       }
//       return done(null, existingUser);
//     }

//     const newUser = em.create(User, {
//       googleId: profile.id,
//       email: profile.emails![0].value,
//       firstName: profile.name!.givenName,
//       lastName: profile.name!.familyName,
//       privilege: 'cliente',
//       isActive: true,
//       password: '',
//       phone: 0, 
//       city: undefined 
//     });

//     await em.persistAndFlush(newUser);
//     return done(null, newUser);
//   } catch (error) {
//     return done(error, undefined);
//   }
// }));

// passport.serializeUser((user: any, done) => {
//   done(null, user.id);
// });

// passport.deserializeUser(async (id: number, done) => {
//   try {
//     const user = await em.findOne(User, { id: id.toString() });
//     done(null, user);
//   } catch (error) {
//     done(error, null);
//   }
// });

// export default passport;