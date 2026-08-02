const sendBtn = document.getElementById("sendBtn");

const responseBox = document.getElementById("response");

async function loadStats(){

    const response = await fetch("http://localhost:3000/api/stats");

    const stats = await response.json();

    document.getElementById("total").textContent =
        stats.totalRequests;

    document.getElementById("allowed").textContent =
        stats.allowedRequests;

    document.getElementById("blocked").textContent =
        stats.blockedRequests;

    document.getElementById("users").textContent =
        stats.activeUsers;

}

sendBtn.addEventListener("click", async ()=>{

    const userId =
        document.getElementById("userId").value;

    const endpoint =
        document.getElementById("endpoint").value;

    const response =
        await fetch("http://localhost:3000/api/request",{

            method:"POST",

            headers:{
                "Content-Type":"application/json"
            },

            body:JSON.stringify({

                userId,

                endpoint

            })

        });

    const data = await response.json();

    responseBox.textContent =
        JSON.stringify(data,null,4);

    loadStats();

});

loadStats();