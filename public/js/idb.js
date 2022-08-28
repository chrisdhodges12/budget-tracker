//create variable to hold db connection
let db;

//establish connection to IndexedDB called 'budget_tracker' and set to version 1
const request = indexedDB.open("budget_tracker", 1);

// event will emit if version changes
request.onupgradeneeded = function (event) {
  //save a reference to the database
  const db = event.target.result;
  //create object store (table) called `new_transaction`
  db.createObjectStore("new_transaction", { autoIncrement: true });
};

//upon a successfull
request.onsuccess = function (event) {
  //when db is successfully created with its object store (from onupgradeneeded above) or... establish a connection and save reference to db in global variable
  db = event.target.result;

  //check if app is online, if yes run uploadTransaction() function to send all local db data to api
  if (navigator.onLine) {
    uploadTransaction();
  }
};

//check for errors
request.onerror = function (event) {
  console.log(event.target.errorCode);
};

//executed if attempt to submit a new transaction with no internet connection
function saveRecord(record) {
  //open a new transaction with the database with read and write permissions
  const transaction = db.transaction(["new_transaction"], "readwrite");

  //access the object store
  const transactionObjectStore = transaction.objectStore("new_transaction");

  //add record to object store
  transactionObjectStore.add(record);
  alert("No internet connection.  Transaction will be completed upon reconnection!");
}

function uploadTransaction() {
  //open a transaction on your db
  const transaction = db.transaction(["new_transaction"], "readwrite");

  //access object store
  const transactionObjectStore = transaction.objectStore("new_transaction");

  //get all records from object store and set to a variable
  const getAll = transactionObjectStore.getAll();

  // upon successful .getAll() execution, run this function
  getAll.onsuccess = function () {
    // if data is in indexedDb object store, send to the api server
    if (getAll.result.length > 0) {
      fetch("/api/transaction", {
        method: "POST",
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
        },
      })
        .then((response) => response.json())
        .then((serverResponse) => {
          if (serverResponse.message) {
            throw new Error(serverResponse);
          }
          // open another transaction
          const transaction = db.transaction(["new_transaction"], "readwrite");
          // access the new_transaction object store
          const transactionObjectStore = transaction.objectStore("new_transaction");
          // clear all items in the object store
          transactionObjectStore.clear();

          alert("All transaction were submitted!");
        })
        .catch((err) => {
          console.log(err);
        });
    }
  };
}

//listen for the app coming back online
window.addEventListener("online", uploadTransaction);
