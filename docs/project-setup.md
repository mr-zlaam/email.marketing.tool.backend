# Project Setup

## Dial Loom Server

### WARNING ⚠️

- Use **`BUN`** as your package manager and as your runtime environment. Don't use `node js` and `npm/yarn/pnpm` otherwise you'll regret truly!!!. Because project is heavily dependent on bun js

## Step1:

- Install BUN from [here](https://bun.sh/docs/installation) for your operating system. Supported OS (Linux, macOS, Windows)
- Confirm installation by running `bun --version`. If it's installed correctly, you should see the version number
- Then clone this project using `git clone git@github.com:Veeivs/dial-loom-mobile-app-server.git`
- Change directory to the project folder using `cd dial-loom-mobile-app-server`
- Install dependencies using `bun install`
- Copy the `.env.example` file to `.env` using `cp .env.example .env`
- Open the `.env` file and fill in the required values
- Run the server using `bun run dev`

## Step2:

- Make sure the server is running (`INFO::✅ Database connected successfully`, `Server is running on http://localhost:8000`)
- Make sure your database is empty to make sure it is empty run this command `bun run db:reset`
- Then run the important migrations using `bun run db:migrate`. This will create the necessary tables in your database
- Check package.json for more commands
