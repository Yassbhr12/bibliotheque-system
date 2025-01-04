const Select = document.getElementById('type');
const livre  = document.getElementById('livre');
const periodique = document.getElementById('periodique');

Select.addEventListener('change' , (e)=>{
    if(e.target.value === 'livre'){
        livre.style.display = 'block';
        periodique.style.display = 'none';
    } else if(e.target.value === 'periodique'){
        livre.style.display = 'none';
        periodique.style.display = 'block';
    } else {
        livre.style.display = 'none';
        periodique.style.display = 'none';
    }
})