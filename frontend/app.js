const button = document.getElementById("sendBtn");

const responseBox = document.getElementById("response");

button.addEventListener("click", async () => {

    const response = await fetch("http://localhost:3000/api/request",{

        method:"POST",

        headers:{
            "Content-Type":"application/json"
        },

        body:JSON.stringify({

            userId:101,

            endpoint:"/products"

        })

    });

    const data = await response.json();

    responseBox.textContent =
        JSON.stringify(data,null,4);

});