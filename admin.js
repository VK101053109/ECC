(function () {
    "use strict";

    let allOrders = [];


    function id(name) {
        return document.getElementById(name);
    }



    function loadOrders() {

        if (!window.ECCOrders) {
            console.error("Orders system missing");
            return;
        }


        setStatus("Loading orders...");


        ECCOrders.loadOrders()

            .then(function (orders) {

                allOrders = orders || [];

                renderOrders();

                setStatus(
                    "Orders loaded",
                    "message-success"
                );

            })


            .catch(function(error){

                console.error(error);

                setStatus(
                    "Failed loading orders",
                    "message-error"
                );

            });

    }







    function setStatus(text,type){

        let el = id("firebaseStatus");

        if(!el) return;


        el.textContent = text;

        el.className =
            type
                ? "admin-meta-item " + type
                : "admin-meta-item";

    }







    function escape(text){

        return String(text || "")

            .replace(/&/g,"&amp;")

            .replace(/</g,"&lt;")

            .replace(/>/g,"&gt;")

            .replace(/"/g,"&quot;");

    }







    function renderOrders(){


        let list = id("adminOrdersList");


        let search =
            (id("orderSearch").value || "")
                .toLowerCase();



        let filtered =
            allOrders.filter(function(order){


                let text = [

                    order.name,
                    order.email,
                    order.address,
                    order.mode,
                    order.notes

                ].join(" ")
                    .toLowerCase();



                return text.includes(search);


            });






        let bundles = 0;
        let singles = 0;



        allOrders.forEach(function(order){

            if(order.mode==="bundle")
                bundles++;

            else
                singles++;

        });





        id("totalOrders").textContent =
            allOrders.length;


        id("bundleOrders").textContent =
            bundles;


        id("singleOrders").textContent =
            singles;



        id("visibleCount").textContent =
            "Showing " + filtered.length + " orders";






        if(filtered.length===0){

            list.innerHTML =
                '<div class="empty-state">No orders found</div>';

            return;
        }







        list.innerHTML =
            filtered.map(function(order){


                return `

            <article class="order-card">


            <div class="order-card-header">


            <div>

            <p class="order-card-kicker">

            ${order.mode==="bundle"
                    ?"Bundle"
                    :"Single"}

            </p>


            <h3>
            ${escape(order.name)}
            </h3>


            </div>




            <button

            class="btn btn-danger deleteOrder"

            data-id="${order.id}">

            Delete

            </button>



            </div>





            <div class="order-card-body">


            <p>
            <b>Email:</b>
            ${escape(order.email)}
            </p>


            <p>
            <b>Address:</b>
            ${escape(order.address)}
            </p>


            <p>
            <b>Services:</b>
            ${(order.services || []).join(", ")}
            </p>



            <p>
            <b>Notes:</b>
            ${escape(order.notes)}
            </p>



            </div>


            </article>

            `;


            }).join("");



    }









    function deleteOrder(id){


        if(!confirm(
            "Delete this order?"
        ))
            return;



        ECCOrders.deleteOrderById(id)

            .then(loadOrders);


    }







    function logout(){

        firebase.auth()
            .signOut()

            .then(function(){

                window.location.href =
                    "login.html";

            });

    }







    function protectPage(){


        firebase.auth()

            .onAuthStateChanged(function(user){


                if(!user){

                    window.location.href =
                        "login.html";

                    return;

                }


                loadOrders();


            });

    }









    document.addEventListener(
        "DOMContentLoaded",
        function(){


            protectPage();



            id("refreshOrdersButton")
                .onclick = loadOrders;



            id("clearOrdersButton")
                .onclick = function(){


                if(confirm(
                    "Delete ALL orders?"
                )){

                    ECCOrders.clearAllOrders()
                        .then(loadOrders);

                }

            };





            id("orderSearch")
                .oninput = renderOrders;





            id("logoutButton")
                .onclick = logout;






            id("adminOrdersList")
                .onclick = function(e){


                if(
                    e.target.classList
                        .contains("deleteOrder")
                ){

                    deleteOrder(
                        e.target.dataset.id
                    );

                }

            };



        });



})();