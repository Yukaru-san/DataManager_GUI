// This will wait for the astilectron namespace to be ready
document.addEventListener('astilectron-ready', function() {
    // This will listen to messages sent by GO
    astilectron.onMessage(function(message) {
        if (message.startsWith("URL")) {
            var s = message.split("%%")[1];
            document.getElementById("serverURL").setAttribute("value", s);
        }
		return message;
    });
})


function login() {

    url = document.getElementById("serverURL").value;
    name = document.getElementById("username").value;
    password = document.getElementById("password").value;

    var json = {
        type: "login",
        url: url,
        name: name,
        password: password
    };

    astilectron.sendMessage(JSON.stringify(json), function(message) {
        if (message === "ServerError") {
            alert("The chosen Server can't be reached. Please check your input.")
        } else {
            alert("Your name and / or password is wrong. Please check your input")
        }
    });

    return
}

function register() {
    url = document.getElementById("serverURL").value;
    name = document.getElementById("username").value;
    password = document.getElementById("password").value;

    var json = {
        type: "register",
        url: url,
        name: name,
        password: password
    };

    // TODO Password retype

    if (name.length > 30) {
        alert("Your Username is too long! A maximum of 30 characters is allowed.");
        return;
    }
    
    if (password.length > 80) {
        alert("Your Password is too long! A maximum of 80 characters is allowed.");
        return;
    }

    if (password.length < 7) {
        alert("Your Password is too short! A minimum of 7 characters is needed.");
        return;
    }

    astilectron.sendMessage(JSON.stringify(json), function(message) {
        if (message === "success") {} else {
            alert("The chosen Server sent a bad reply. Please check your input.")
        }
    });

}

function done() { 
    document.getElementById("popup").style.display = "none";
    var password = document.getElementById("pass").value;
    
    //DO STUFF WITH PASSWORD HERE    
};



// ---------- Password Repeat -------------- \\


// Get the modal
var modal = document.getElementById("myModal");

// Get the button that opens the modal
var btn = document.getElementById("myBtn");

// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];

// When the user clicks the button, open the modal 
btn.onclick = function() {
  modal.style.display = "block";
}

// When the user clicks on <span> (x), close the modal
span.onclick = function() {
  modal.style.display = "none";
}

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
}