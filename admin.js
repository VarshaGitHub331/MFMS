const express = require("express");
const router = express.Router();
const mysql = require("mysql2/promise");
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "DBSproject123",
  database: "mfms",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
async function calculateFundPrices() {
  try {
    fundPrices = [];

    // Fetch all funds
    let [funds, fields] = await pool.query("SELECT * FROM FundDetails");

    // Iterate over each fund
    for (const fund of funds) {
      // Fetch composition of the current fund
      const [fundComposition] = await pool.query(
        "SELECT * FROM Fund WHERE FundNo = ? ",
        [fund.FundNo]
      );

      // Calculate total price for the fund
      let totalPrice = 0;
      for (const item of fundComposition) {
        // Fetch latest price for the company
        const [latestPrice] = await pool.query(
          "SELECT Price FROM MOAD where CompanyNo =? ORDER BY date DESC",
          [item.CompanyNo]
        );

        // Multiply price by quantity and add to total price
        totalPrice += latestPrice[0].Price * item.Quantity;
      }

      // Add fund number and total price to the array
      fundPrices.push({
        FundNo: fund.FundNo,
        Name: fund.FundName,
        Price: totalPrice,
      });
    }

    return fundPrices;
  } catch (error) {
    console.error("Error calculating fund prices:", error);
    return [];
  }
}
router.get("/login", (req, res, next) => {
  res.render("admin.ejs");
});
router.post("/login", async (req, res, next) => {
  const { username, password } = req.body;
  try {
    const [rows, fields] = await pool.query(
      "SELECT * FROM Admin where Username=? and Password=?",
      [username, password]
    );
    if (rows[0]) {
      req.session.logged = true;
      res.locals.currentUser = true;
      req.flash("success", "Successfully Logged In");
      res.render("ahome.ejs", {
        name: rows[0].Username,
        UserId: rows[0].UserID,
      });
    } else {
      req.flash("error", "Invalid Username Or Password");
      res.redirect("/admin/login");
    }
  } catch (e) {
    console.log(e);
  }
});
router.get("/monitor", async (req, res, next) => {
  try {
    let fp = await calculateFundPrices();
    fp = Array.from(fp);
    console.log(fp);

    res.render("aviews.ejs", { fp });
  } catch (e) {}
});
router.get("/create", (req, res, next) => {
  res.render("createf.ejs");
});
router.post("/create", async (req, res, next) => {
  const { fundno, fundname, funddesc } = req.body;
  try {
    // Insert the new fund into the FundDetails table
    await pool.query(
      "INSERT INTO FundDetails (FundNo, FundName, Fund_Description) VALUES (?, ?, ?)",
      [fundno, fundname, funddesc]
    );

    // Redirect to a success page or send a success response
    res.redirect("/admin/monitor");
  } catch (error) {
    // Handle errors
    console.error("Error creating fund:", error);
    res.status(500).send("Error creating fund. Please try again later.");
  }
});

module.exports = router;
