const email = document.getElementById("email");
const password = document.getElementById("password");

const loginButton = document.getElementById("loginButton");
const signupButton = document.getElementById("signupButton");

const message = document.getElementById("message");



loginButton.onclick = function () {


    const userEmail = email.value;
    const userPassword = password.value;



    if (userEmail === "" || userPassword === "") {

        message.innerHTML = "Enter email and password";

        return;

    }



    firebase.auth()

        .signInWithEmailAndPassword(
            userEmail,
            userPassword
        )


        .then(() => {


            message.innerHTML = "Login successful";


            setTimeout(() => {


                window.location.href = "order2.html";


            }, 1000);



        })


        .catch((error) => {


            message.innerHTML = error.message;


        });



};








signupButton.onclick = function () {


    const userEmail = email.value;
    const userPassword = password.value;




    if (userEmail === "" || userPassword === "") {


        message.innerHTML = "Enter email and password";


        return;


    }





    firebase.auth()

        .createUserWithEmailAndPassword(
            userEmail,
            userPassword
        )


        .then(() => {



            message.innerHTML = "Account created";



            setTimeout(() => {


                window.location.href = "order2.html";


            }, 1000);



        })



        .catch((error) => {



            message.innerHTML = error.message;



        });



};








firebase.auth()

    .onAuthStateChanged((user) => {



        if (user) {


            message.innerHTML =
                "Logged in as " + user.email;


        }



    });