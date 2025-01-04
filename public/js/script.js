
document.getElementById('feedbackForm').addEventListener('click', function(event) {

    document.getElementById('error-message').style.display = 'none';
    

    const name = document.querySelector('input[name="name"]');
    const lastname = document.querySelector('input[name="lastname"]');
    const email = document.querySelector('input[name="email"]');
    
    let formValid = true;


    if (!name.value || !lastname.value || !email.value) {
        formValid = false;
        document.getElementById('error-message').style.display = 'block';
    }

    if (!formValid) {
        event.preventDefault(); 
    }
});

