const express = require("express");
const app = express();
const { PageNotFound } = require("./utils/page.js");
const { urlencoded } = require("body-parser");
const client = require("./client.js");
const admin = require("./admin.js");
const path = require("path");
const ejs = require("ejs");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const flash = require("connect-flash");
const mysql = require("mysql2");
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "DBSproject123",
  database: "mfms",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
pool.on("error", (err) => {
  console.error("MySQL pool error:", err);
});
pool.query("SELECT * FROM funddetails", (error, results, fields) => {
  if (error) {
    console.error("Error executing query:", error);
    return;
  }
  console.log("Query results:", results);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: "Yourexpresssession",
    resave: true,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 30 * 24 * 7,
    },
  })
);

app.use(flash());

app.listen(3000, () => {
  console.log("listening");
});
app.set("views", path.join(__dirname, "./VIEWS"));
app.use(express.static(path.join(__dirname, "./public")));
app.set("view engine", "ejs");
app.engine("ejs", ejsMate);
app.use((req, res, next) => {
  console.log(req.session.logged);
  res.locals.currentUser = req.session.logged;
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.Name = req.session.Name;
  res.locals.CustomerNo = req.session.CustomerNo;
  res.locals.Balance = req.session.Balance;
  res.locals.id = req.session.CustomerNo;
  console.log(res.locals.Name);
  console.log(res.locals.CustomerNo);
  console.log(res.locals.Balance);
  next();
});
app.get("/home", (req, res, next) => {
  res.render("home.ejs");
});
app.use("/client", client);
app.use("/admin", admin);
app.get("/logout", (req, res, next) => {
  console.log("called");
  req.session.destroy();
  res.redirect("/client/login");
});
app.all("*", (req, res, next) => {
  let e = new PageNotFound("Page Not Found", 404);
  next(e);
});
app.use((err, req, res, next) => {
  const { message = "Some app error occured", statusCode = 200 } = err;
  res.render("error.ejs", { message, statusCode });
});
