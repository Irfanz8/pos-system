# Deploying POS System to Render

This project is configured for easy deployment to [Render](https://render.com) using Blueprints.

## Prerequisites

1. A [Render](https://render.com) account.
2. The project code pushed to a GitHub or GitLab repository.

## Deployment Steps

1. **Dashboard**: Log in to your Render Dashboard.
2. **New Blueprint**: Click on user **New +** and select **Blueprint**.
3. **Connect Repository**: Connect your GitHub/GitLab account and select this repository.
4. **Service Name**: Give your blueprint a name (e.g., `pos-system`).
5. **Apply**: Click **Apply**.

Render will automatically detect the `render.yaml` file and create the following resources:

1. **PostgreSQL Database** (`pos-db`): Managing the application data.
2. **Web Service** (`pos-api`): The Node.js backend API.
3. **Static Site** (`pos-admin`): The Admin Dashboard frontend.
4. **Static Site** (`pos-cashier`): The Cashier App frontend.

## Environment Variables

The `render.yaml` automatically sets up necessary environment variables:

- `DATABASE_URL`: Automatically linked from the database to the API service.
- `VITE_API_URL`: Automatically linked from the API service to the frontend apps.
- `JWT_SECRET`: Automatically generated securely.

**Note:** If you need additional environment variables (e.g., for email services or AI keys), you can add them in the Render Dashboard under the **Environment** tab for the specific service (`pos-api`) after the initial setup.

## Database Migrations

The build command for the API service includes `npm run generate -w packages/database` to generate the Prisma client.
However, for the _first_ deployment or schema changes, you might need to push the schema to the database.

Render Blueprints don't support running one-off tasks easily during the build for DB migrations in the free tier sometimes.
The recommended way for this setup is to use the `buildCommand` which we have set up to generate the client.

If you need to run `prisma db push` to sync the schema:

1. Go to the **pos-api** service in Render dashboard.
2. Use the **Shell** tab.
3. Run: `npm run db:push -w packages/database`

Or, you can add it to the build command in `render.yaml` if you prefer it to run on every build (be careful with production data if using `push` vs `migrate`).

Current Build Command:
`npm install && npm run generate -w packages/database && npm run build -w packages/api`

## Accessing Your Apps

Once deployed, Render will provide URLs for each service:

- **Admin App**: `https://pos-admin-xxxx.onrender.com`
- **Cashier App**: `https://pos-cashier-xxxx.onrender.com`
- **API**: `https://pos-api-xxxx.onrender.com`
