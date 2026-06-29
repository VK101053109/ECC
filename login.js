(function () {

    "use strict";


    document.addEventListener(
        "DOMContentLoaded",
        function () {


            const emailInput =
                document.getElementById("email");


            const passwordInput =
                document.getElementById("password");


            const button =
                document.getElementById("loginButton");


            const message =
                document.getElementById("message");




            // If already logged in, go straight to admin
            firebase.auth()
                .onAuthStateChanged(function(user){

                    if(user){

                        window.location.href =
                            "admin.html";

                    }

                });







            button.onclick = function(){


                const email =
                    emailInput.value.trim();


                const password =
                    passwordInput.value;




                if(!email || !password){

                    message.innerHTML =
                        "Enter email and password";

                    return;

                }





                message.innerHTML =
                    "Signing in...";





                firebase.auth()

                    .signInWithEmailAndPassword(
                        email,
                        password
                    )

                    .then(function(result){


                        console.log(
                            "Login successful",
                            result.user.email
                        );



                        message.innerHTML =
                            "Success! Loading...";



                        window.location.href =
                            "admin.html";



                    })



                    .catch(function(error){


                        console.error(error);



                        message.innerHTML =
                            error.message;



                    });



            };






            passwordInput
                .addEventListener(
                    "keydown",
                    function(e){

                        if(e.key === "Enter"){

                            button.click();

                        }

                    }
                );



        });



})();