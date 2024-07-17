console.log("hi");

let rele = document.getElementById("fq");
console.log(rele);
let cele = document.getElementById("price");
let label = document.getElementsByClassName("labelp");

const HandleChange = (e) => {
  console.log(label);
  let num = rele.value;
  alert("Hi is recieved the value", +price);
  alert(price);
  cele.value = Number(cele.value) * num;
};
