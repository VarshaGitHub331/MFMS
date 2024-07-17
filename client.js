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
let fundPrices;
async function updateOwns(id, fid, quantity) {
  try {
    // Check if the client already owns the fund
    const [rows] = await pool.query(
      "SELECT * FROM clientowns WHERE CustomerNo = ? AND FundNo = ?",
      [id, fid]
    );

    // If the client owns the fund, update the quantity
    if (rows.length > 0) {
      await pool.query(
        "UPDATE clientowns SET Quantity = Quantity + ? WHERE CustomerNo = ? AND FundNo = ?",
        [quantity, id, fid]
      );
    } else {
      // If the client doesn't own the fund, insert a new row
      await pool.query(
        "INSERT INTO clientowns (CustomerNo, FundNo, Quantity) VALUES (?, ?, ?)",
        [id, fid, quantity]
      );
    }
  } catch (error) {
    console.error("Error updating Owns table:", error);
    throw error;
  }
}

async function calculateFundPrices() {
  try {
    fundPrices = [];

    // Fetch all funds
    let [funds, fields] = await pool.query("SELECT * FROM FundDetails");

    // Iterate over each fund
    for (const fund of funds) {
      // Fetch composition of the current fund
      const [fundComposition] = await pool.query(
        "SELECT * FROM Fund WHERE FundNo = ?",
        [fund.FundNo]
      );

      // Calculate total price for the fund
      let totalPrice = 0;

      // Iterate over each company in the fund
      for (const item of fundComposition) {
        // Fetch latest price for the company
        const [latestPrice] = await pool.query(
          "SELECT Price FROM MOAD WHERE CompanyNo = ? ORDER BY Date DESC LIMIT 1",
          [item.CompanyNo]
        );

        // If there's no price available, skip this company
        if (latestPrice.length === 0) {
          continue;
        }
        console.log(latestPrice[0], "is the latest price");

        // Multiply price by quantity and add to total price
        totalPrice += latestPrice[0].Price * item.Quantity;
      }
      totalPrice = Number(totalPrice.toFixed(2));
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

function generateRandomId(length) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
async function calculateTopBottomFunds() {
  try {
    let fundPrices = [];

    // Fetch all funds
    let [funds, fields] = await pool.query("SELECT * FROM FundDetails");

    // Iterate over each fund
    for (const fund of funds) {
      // Fetch composition of the current fund
      let [fundComposition] = await pool.query(
        "SELECT * FROM Fund WHERE FundNo = ?",
        [fund.FundNo]
      );
      fundComposition = Array.from(fundComposition);
      // Calculate total price for the fund
      let totalPrice = 0;

      // Iterate over each company in the fund
      for (const item of fundComposition) {
        // Fetch latest price for the company
        const [latestPrice] = await pool.query(
          "SELECT Price FROM MOAD WHERE CompanyNo = ? ORDER BY Date DESC LIMIT 1",
          [item.CompanyNo]
        );

        // If there's no price available, skip this company
        if (latestPrice.length === 0) {
          continue;
        }

        // Multiply price by quantity and add to total price
        totalPrice += latestPrice[0].Price * item.Quantity;
      }

      // Round the total price to two decimal places
      totalPrice = Number(totalPrice.toFixed(2));

      // Add fund number, name, and rounded price to the array
      fundPrices.push({
        FundNo: fund.FundNo,
        Name: fund.FundName,
        Price: totalPrice,
      });
    }
    fundPrices = Array.from(fundPrices);

    // Sort fundPrices array by price in descending order
    fundPrices.sort((a, b) => b.Price - a.Price);

    // Extract top 5 and bottom 5 funds
    const topFunds = fundPrices.slice(0, 5);
    const bottomFunds = fundPrices.slice(-5);

    return [topFunds, bottomFunds];
  } catch (error) {
    console.error("Error calculating fund prices:", error);
  }
}

async function calculateSellingPrices(funds) {
  try {
    fundPrices = [];
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
        owned: fund.Quantity,
      });
    }

    return fundPrices;
  } catch (error) {
    console.error("Error calculating fund prices:", error);
    return [];
  }
}

router.get("/login", (req, res, next) => {
  res.render("clogin.ejs");
});
router.post("/login", async (req, res, next) => {
  const { username, password } = req.body;
  let [rows, fields] = await pool.query(
    "SELECT * from ClientLogin where Username =? AND Password=?",
    [username, password]
  );
  let rows2 = rows;

  if (rows[0]) {
    req.session.logged = true;
    console.log(req.session.logged);
    req.flash("success", "You Have Logged in");
    res.locals.currentUser = true;
    [rows, fields] = await pool.query(
      "SELECT * from clientinfo where CustomerNo=?",
      rows2[0].CustomerNo
    );
    console.log(rows);
    console.log(fields);
    req.session.CustomerNo = rows[0].CustomerNo;
    req.session.Name = rows[0].NAME;
    req.session.Balance = rows[0].Balance;
    res.render("chome.ejs", { person: rows2[0] });
  } else {
    req.flash("error", "Invalid Username Or Password");
    res.redirect("/client/login");
  }
});
router.get("/:id/buy", async (req, res, next) => {
  /*Fetch from funds fund no and cmpany nos and quantity for each fund. Now go to the company table 
  and find the price of those companies  (price int) from that table today and then multiple with qu
  antity from of that company from funds table. Make an array of objects for all the funds. Pass them 
  to the cbuy.ejs page.*/
  const { id } = req.params;
  let fp = await calculateFundPrices();
  fp = Array.from(fp);
  console.log(fp);

  res.render("cbuy.ejs", { fp, id });
});
router.post("/:id/buy/:itemid", async (req, res, next) => {
  const { quantity, price, totalPrice } = req.body;
  const { id, itemid } = req.params;

  try {
    // Fetch the current balance of the client
    const [clientRows] = await pool.query(
      "SELECT Balance FROM ClientInfo WHERE CustomerNo = ?",
      [id]
    );

    // Extract the current balance from the fetched rows
    const currentBalance = clientRows[0].Balance;

    // Calculate the new balance after buying the fund
    const newBalance = currentBalance - totalPrice;

    if (newBalance < 0) {
      req.flash("error", "Insufficient Balance");
      res.redirect(`/client/${id}/portfolio`);
    } else {
      // Update the balance in the ClientInfo table
      await pool.query(
        "UPDATE ClientInfo SET Balance = ? WHERE CustomerNo = ?",
        [newBalance, id]
      );

      let BuyId = generateRandomId(8);
      const currentDate = new Date().toISOString().slice(0, 10);
      const query = `INSERT INTO clientbought (BuyId, CustomerNo, Quantity, Date) VALUES (?, ?, ?, ?)`;

      // Parameters for the query
      const values = [BuyId, id, quantity, currentDate];

      // Execute the query
      await pool.query(query, values);
      await updateOwns(id, itemid, quantity);

      // Redirect to the client's portfolio page
      req.flash("success", "Payment Done");
      res.redirect(`/client/${id}/portfolio`);
    }
  } catch (error) {
    next(error);
  }
});

router.get("/fp/item/:itemid/:id/buy", async (req, res, next) => {
  /*const price=fundPrice.filter((item,i,arr)=>item.FundNo===itemno)*/
  await calculateFundPrices();
  const { itemid, id } = req.params;
  const founditem = Array.from(fundPrices).filter(
    (item, i, arr) => item.FundNo == itemid
  );
  console.log(founditem);
  const Price = founditem[0].Price;
  const Name = founditem[0].Name;
  res.locals.price = Price;
  console.log("The value of local", res.locals.price);
  res.render("cbuydet.ejs", { Price: Price, Name: Name, id, itemid });
});
router.get("/fp/item/:id", async (req, res, next) => {
  const { id } = req.params;
  let [drows, dfields] = await pool.query(
    "SELECT Fund_Description From FundDetails where FundNo =?",
    id
  );
  let [rows, fields] = await pool.query(
    "SELECT Name,Quantity From Fund Natural Join CompanyDetails where FundNo= ? ",
    id
  );
  rows = Array.from(rows);
  console.log(rows);
  res.render("fview.ejs", { rows, description: drows[0] });
});
router.get("/:id/owns", async (req, res, next) => {
  console.log("I was called");
  const { id } = req.params;
  console.log(id);
  try {
    const [rows, fields] = await pool.query(
      "SELECT FundNo, FundName, Quantity FROM ClientOwns NATURAL JOIN FundDetails WHERE CustomerNo = ?",
      [id]
    );

    // Check if rows exist before rendering
    if (rows && rows.length > 0) {
      // Render the template with the funds data
      res.render("cowns.ejs", { funds: rows, id });
    } else {
      // If no funds are found, render the template with an empty array
      res.render("cowns.ejs", { funds: [] });
    }
  } catch (e) {
    next(e);
  }
});

router.get("/:id/sell", async (req, res, next) => {
  const { id } = req.params;
  console.log(id);
  try {
    let [rows, fields] = await pool.query(
      "SELECT FundNo, FundName, Quantity FROM ClientOwns NATURAL JOIN FundDetails WHERE CustomerNo = ?",
      [id]
    );
    rows = Array.from(rows);
    let funds = await calculateSellingPrices(rows);
    console.log(funds);
    // Check if rows exist before rendering
    if (rows && rows.length > 0) {
      // Render the template with the funds data
      res.render("csell.ejs", { funds: funds, id });
    } else {
      // If no funds are found, render the template with an empty array
      res.render("csell.ejs", { funds: [], id });
    }
  } catch (e) {
    next(e);
  }
});
router.post("/fp/item/:itemid/:id/sell", async (req, res, next) => {
  let { quantity } = req.body;
  quantity = Number(quantity);
  const { itemid, id } = req.params;
  let fundPrices = await calculateFundPrices();
  let reqf = fundPrices.filter((v, i, arr) => v.FundNo == itemid);
  try {
    const [clientRows] = await pool.query(
      "SELECT Balance FROM ClientInfo WHERE CustomerNo = ?",
      [id]
    );

    // Extract the current balance from the fetched rows
    const currentBalance = clientRows[0].Balance;

    // Calculate the new balance after buying the fund
    const newBalance = currentBalance + reqf[0].Price * quantity;
    await pool.query("UPDATE ClientInfo SET Balance = ? WHERE CustomerNo = ?", [
      newBalance,
      id,
    ]);
    const [clientowns] = await pool.query(
      "SELECT Quantity from ClientOwns where FundNo =?",
      [id]
    );
    console.log(clientowns[0]);
    const newowns = clientowns[0].Quantity - quantity;
    await pool.query("UPDATE ClientOwns SET Quantity=? where FundNo =?", [
      newowns,
      id,
    ]);
    let SellId = generateRandomId(8);
    const currentDate = new Date().toISOString().slice(0, 10);
    const query = `INSERT INTO clientsold (SellID, CustomerNo, Quantity, Date) VALUES (?, ?, ?, ?)`;

    // Parameters for the query
    const values = [SellId, id, quantity, currentDate];
    await pool.query(query, values);

    // Redirect to the client's portfolio page
    req.flash("success", "Balance Updated!!!");
    res.redirect(`/client/${id}/portfolio`);
  } catch (e) {
    console.log(e);
  }
});
router.post("/:id/sell", async (req, res, next) => {
  const { quantity } = req.body;
  /*fetch client id and update balance*/
  res.redirect("/client/id/portfolio");
});
router.get("/:id/portfolio", async (req, res, next) => {
  const { id } = req.params;
  let [rows, field] = await pool.query(
    "SELECT * from ClientInfo where CustomerNo=?",
    id
  );
  let rows2 = rows;
  try {
    [rows, field] = await pool.query(
      "SELECT CustomerNo, COUNT(BuyID) AS NumberOfFundsBought FROM clientbought  GROUP BY CustomerNo;",
      id
    );
    let rows3 = rows[0];
    console.log(rows3);
    [rows, field] = await pool.query(
      "SELECT CustomerNo, COUNT(SellID) AS NumberOfFundsSold FROM clientsold  GROUP BY CustomerNo;",
      id
    );
    let rows4 = rows[0];
    console.log(rows4);
    res.render("portfolio.ejs", {
      person: rows2[0],
      id,
      nb: rows3.NumberOfFundsBought,
      ns: rows4.NumberOfFundsSold,
    });
  } catch (e) {
    next(e);
  }
});
router.get("/:id/top5", async (req, res, next) => {
  const { id } = req.params;
  let [topFunds, bottomFunds] = await calculateTopBottomFunds();
  console.log(topFunds);
  let tf = Array.from(topFunds);
  res.render("cbuy.ejs", { fp: tf, id });
});
router.get("/:id/bottom5", async (req, res, next) => {
  const { id } = req.params;
  let [topFunds, bottomFunds] = await calculateTopBottomFunds();
  let bf = Array.from(bottomFunds);
  res.render("cbuy.ejs", { fp: bf, id });
});

module.exports = router;
