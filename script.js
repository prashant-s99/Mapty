'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App{

    #map;
    #mapZoom= 13;
    #mapEvent;
    #workouts= [];

    //This constructor function will be called immediately when an object is created from this class.
    constructor(){
        //Getting user's position.
        this._getPosition();

        //Get data from local storage.
        this._getLocalStorage();

        //Attaching event handlers
        form.addEventListener('submit', this._newWorkout.bind(this));
        inputType.addEventListener('change', this._toggleElevationField);
        containerWorkouts.addEventListener('click',this._moveToWorkout.bind(this));
    }

    //This function is used to capture the user's current location.        
    _getPosition(){
        if(navigator.geolocation){
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function(){
                    alert('Could not get your location!')
                });
            }
    }

    //This sets the view of map to current location of the user.
    _loadMap(position){
        const {latitude}= position.coords;
        const {longitude}= position.coords;

        const coords = [latitude,longitude];

        this.#map = L.map('map').setView(coords, this.#mapZoom);

        //This sets the tile layer design according to our need. 
        L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        
        this.#map.on('click', this._showForm.bind(this));

        this.#workouts.forEach(work => {
            this._renderWorkoutMarker(work);
    });

    }

    //This shows the form when user clicks on the map.
    _showForm(mapE){
        this.#mapEvent= mapE; 
        form.classList.remove('hidden');
        inputDistance.focus();
    }

    //This hides the form when a workout is rendered on map and on list
    _hideForm(){
        inputDistance.value= inputDuration.value= inputCadence.value= inputElevation.value ='';
        form.style.display= 'none';
        form.classList.add('hidden');
        setTimeout(()=> form.style.display= 'grid', 1000);
    }

    //Changing Workout input form according to 'Type' of workout.
    _toggleElevationField(){
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }

    //This function creates a new workout and creates a marker on the map.
    _newWorkout(e){
        e.preventDefault();

        //Validation data function
        const validInputs= (...inputs) =>
            inputs.every(inp => Number.isFinite(inp)); //Return true if inputs are numbers.
        const allPositive= (...inputs) =>
            inputs.every(inp => inp>0); //Returns true if inputs are positive.

        //Getting data from form
        const type= inputType.value;
        const distance= +inputDistance.value;
        const duration= +inputDuration.value;
        //Getting coordinates of the point clicked on the map.
        const cords = [this.#mapEvent.latlng.lat, this.#mapEvent.latlng.lng];
        
        let workout;
        
        // If workout is running then create Running object
        if(type === 'running'){
            const cadence= +inputCadence.value;
            //Form data validation
            if(!validInputs(distance,duration,cadence) || !allPositive(distance,duration,cadence))
                return alert('Inputs have to be positive numbers!');
            workout= new Running(cords, distance,duration,cadence);
        }

        // If workout is cycling then create Cycling object
        if(type === 'cycling'){
            const elevation= +inputElevation.value;
            //Form data validation
            if(!validInputs(distance,duration,elevation) || !allPositive(distance,duration))
                return alert('Inputs have to be positive numbers!');
            workout= new Cycling(cords, distance,duration,elevation);
        }

        // Add new object to new Workout array
        this.#workouts.push(workout);

        // Render workout on map as marker
        this._renderWorkoutMarker(workout);

        // Render worout on list
        this._renderWorkout(workout);

        //Hiding form and clearing input fields.
        this._hideForm();

        //Setting local storage to all workouts.
        this._setLocalStorage();
    }

    // Rendering workout on map as marker
    _renderWorkoutMarker(workout){
        L.marker(workout.cords).addTo(this.#map).bindPopup(L.popup({
            maxWidth : 250,
            minWidth : 100,
            autoClose : false,
            closeOnClick : false,
            className : `${workout.type}-popup`,
        })).setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.workoutDescription}`).openPopup();
    }


    _renderWorkout(workout){
        let html= `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
            <h2 class="workout__title">${workout.workoutDescription}</h2>
            <div class="workout__details">
                <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
                <span class="workout__value">${workout.distance}</span>
                <span class="workout__unit">km</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⏱</span>
                <span class="workout__value">${workout.duration}</span>
                <span class="workout__unit">min</span>
            </div>`;

        if(workout.type==='running')
            html+= `
            <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.pace.toFixed(1)}</span>
                <span class="workout__unit">min/km</span>
                </div>
                <div class="workout__details">
                <span class="workout__icon">🦶🏼</span>
                <span class="workout__value">${workout.cadence}</span>
                <span class="workout__unit">spm</span>
            </div>
        </li>`;

        if(workout.type==='cycling')
            html+= `
            <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.speed.toFixed(1)}</span>
                <span class="workout__unit">km/h</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⛰</span>
                <span class="workout__value">${workout.elevation}</span>
                <span class="workout__unit">m</span>
            </div>
        </li>`;

        // Inserting HTML to render workout on list
        form.insertAdjacentHTML('afterend', html);
    }

    //This function moves the current map position to the marker's position when clicked on the correcponding workout in list.
    _moveToWorkout(e){
        const workoutEl = e.target.closest('.workout');

        if(!workoutEl) return;

        const workout = this.#workouts.find( work => work.id === workoutEl.dataset.id);
        //Moving the focus on the workout clicked in list.
        this.#map.setView(workout.cords, this.#mapZoom,{
            animate : true,
            pan : {
                duration: 1,
            }
        });
    }

    //This function is used to save workout in the local storage.
    _setLocalStorage(){
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }

    //Getting local storage data
    _getLocalStorage(){
        const data=  JSON.parse(localStorage.getItem('workouts'));

        if (!data) return;

        this.#workouts= data;

        this.#workouts.forEach(work => {
            this._renderWorkout(work);
    });
    }

    //Function to remove all the workouts from the local storage.

    reset(){
        localStorage.removeItem('workouts');
        location.reload();
    }
}

//This class is Parent class of Running and Cycling
class Workout{

    date= new Date();
    id= (Date.now() + '').slice(-10);

    constructor(cords, distance,duration){
        this.cords= cords;  // [lat, lng]
        this.distance= distance;    // in km
        this.duration= duration;    // in min
    }

    _setWorkoutDescription(){
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        this.workoutDescription = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${this.date.getDate()} ${months[this.date.getMonth()]}`;
    }
}

class Running extends Workout{
    type= 'running';

    constructor(cords, distance, duration, cadence){
        super(cords, distance, duration);
        this.cadence= cadence;
        this.calcPace();
        this._setWorkoutDescription();
 }
    //This function calculates Pace.
    calcPace(){
        this.pace= this.duration/this.distance;
    }
}

class Cycling extends Workout{
    type= 'cycling';

    constructor(cords, distance, duration, elevation) {
        super(cords, distance, duration);
        this.elevation= elevation;
        this.calcSpeed();
        this._setWorkoutDescription();
}
    //This function calculates Speed.
    calcSpeed(){
        this.speed= this.distance/this.duration/60;
    }
}


const app= new App();
