import express from "express";
import cors from "cors";
import { AuthRoutes } from "./modules/auth/auth.route";
import { UserRoutes } from "./modules/user/user.route";
import { AdminRoutes } from "./modules/admin/admin.route";

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use("/api/v1/auth",AuthRoutes)
app.use("/api/v1/users", UserRoutes);
app.use("/api/v1/admin", AdminRoutes);

app.get("/",(req, res) => {
    res.send("Server is running....")
});

export default app;



