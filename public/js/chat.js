const socket = io()

const $messageForm = document.querySelector('#message-form')
const $messageFormInput = $messageForm.querySelector('input')
const $messageFormButton = $messageForm.querySelector('button')

const $sendLocationButton = document.querySelector('#send-location')

const $messages = document.querySelector('#messages')

// templates
const messageTemplate = document.querySelector('#message-template').innerHTML
const locationMessageTemplate = document.querySelector('#location-message-template').innerHTML
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML

// to get username, room from the url
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true })

const autoScroll = () => {
    // New message element
    const $newMessage = $messages.lastElementChild

    // Height of the new message
    const newMessageStyles = getComputedStyle($newMessage)  // to get margins
    const newMessageMargin = parseInt(newMessageStyles.marginBottom)
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin

    // Visible height
    const visibleHeight = $messages.offsetHeight

    // Height of messages container
    const containerHeight = $messages.scrollHeight

    // How far have I scrolled?
    const scrollOffset = $messages.scrollTop + visibleHeight

    if (containerHeight - newMessageHeight <= scrollOffset) {
        $messages.scrollTop = $messages.scrollHeight
    }
}

socket.emit('join', { username, room }, (error) => {
    if (error) {
        alert(error)
        location.href = '/'
    }
    
    console.log('Joined the room')
})

socket.on('message', (message) => {
    console.log(message)

    const html = Mustache.render(messageTemplate, { 
        username: message.username,
        createdAt: moment(message.createdAt).format('h:mm a'), 
        message: message.text 
    })
    $messages.insertAdjacentHTML('beforeend', html)

    autoScroll()
})

socket.on('locationMessage', (locationMessage) => {
    console.log(locationMessage.locationUrl)

    const html = Mustache.render(locationMessageTemplate, { 
        username: locationMessage.username,
        createdAt: moment(locationMessage.createdAt).format('h:mm a'),
        locationUrl: locationMessage.locationUrl
    })
    $messages.insertAdjacentHTML('beforeend', html)

    autoScroll()
})

socket.on('roomData', ({ room, users }) => {
    console.log(room)
    console.log(users)

    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    })
    document.querySelector('#sidebar').innerHTML = html
})

$messageForm.addEventListener('submit', (e) => {
    e.preventDefault()

    $messageFormButton.setAttribute('disabled', 'disabled')

    const message = e.target.elements.message.value

    socket.emit('sendMessage', message, (error) => {
        $messageFormButton.removeAttribute('disabled')
        $messageFormInput.value = ''
        $messageFormInput.focus()

        if (error)
            return console.log(error)

        console.log('The message was delivered')
    })
})

$sendLocationButton.addEventListener('click', () => {
    $sendLocationButton.setAttribute('disabled', 'disabled')

    if (!navigator.geolocation)
        return alert('Geolocation is not supported by your browser')

    navigator.geolocation.getCurrentPosition(position => {
        console.log(position)

        const location = {
            lat: position.coords.latitude,
            long: position.coords.longitude
        }
        socket.emit('sendLocation', location, () => {
            $sendLocationButton.removeAttribute('disabled')
            
            console.log('The location was sent')
        })
    })
})