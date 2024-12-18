// app/services/auth.server.ts
import { Authenticator } from "remix-auth";
import { sessionStorage } from "~/services/session.server";
import User, { UserInterface } from "./models/User";
import { GitHubStrategy } from "remix-auth-github";

// Create an instance of the authenticator, pass a generic with what
// strategies will return and will store in the session
export const authenticator = new Authenticator<UserInterface>(sessionStorage);

authenticator.use(
  new GitHubStrategy(
    {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      redirectURI:
        process.env.GITHUB_REDIRECT_URI ||
        "http://localhost:3000/auth/github/callback",
    },
    async ({ profile }) => {
      let user = await User.findOne({ email: profile.emails[0].value });

      console.log("Authenticating with GitHub", user);

      if (!user) {
        console.log("Creating user", profile.emails[0].value);
        user = new User({
          email: profile.emails[0].value,
        });

        await user.save();
      }

      console.log("Authenticated with GitHub", user);
      return user;
    }
  ),
  "github"
);
