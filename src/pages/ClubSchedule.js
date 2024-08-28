import React, { useContext, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import Header from "../components/header/Header.jsx";
import Footer from "../components/footer/Footer.jsx";
import { EventContext } from '../components/contexts/EventContext';
import { UserContext } from '../components/contexts/UserContext';
import EventRegistrationModal from '../components/modals/EventRegistrationModal'; // Import the modal
import "./ClubSchedule.css"

const googleSheetURL = process.env.REACT_APP_API_KEY_CLUB_SCHEDULE;
const updateUserURL = process.env.REACT_APP_API_KEY_MEMBER;

const ClubSchedule = () => {
  const { user, setUser } = useContext(UserContext);
  const { events, addParticipant, removeParticipant, isFetching } = useContext(EventContext);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  // const [success, setSuccess] = useState(false);


  const handleEventClick = (info) => {
    const clickedEvent = events.find(event => event.id === info.event.id);
    // clickedEvent.maxParticipants = maxParticipants
    setSelectedEvent(clickedEvent);
    setModalIsOpen(true);
  };

  const handleUserBooking = async (action) =>{
    let actBooking = 0;
    if (action === "add"){
      actBooking = -1
    } else if(action ==='remove'){
      actBooking = 1
    }
    try{
      const response = await fetch(updateUserURL, {
        // redirect: "follow",
        method: 'POST',
        // headers: {
        //   "Content-Type": "text/plain;charset=utf-8",
        // },
        body: JSON.stringify({
          email: user.email,
          phone: user.phone,
          booking: user.booking + actBooking+"",
        }),
      });
      if (response.status === 200) {
        let updatedUser = {...user,booking:user.booking + actBooking}
        setUser(updatedUser)

        return { success: true };
      }

    }catch{
      return { success: false, message: 'Error! Possibly server limit reached. Try again tomorrow.' };
    }
  }

  const handleParticipate = async () => {    
    if (selectedEvent.number_of_participants < selectedEvent.maxParticipants) {      
      try {
        const response = await fetch(googleSheetURL, {
          // redirect: "follow",
          method: 'POST',
          // headers: {
          //   "Content-Type": "text/plain;charset=utf-8",
          // },
          body: JSON.stringify({
            eventId: selectedEvent.id,
            participantName: user.name,
            eventDate: selectedEvent.start.split('T')[0],
            action: "add"
          }),

        });
        // console.log(response);

        if (response.status === 200) {
          handleUserBooking("add");
          const updatedParticipants = selectedEvent.participants + ', ' + user.name;

          const updatedEvent = {
            ...selectedEvent,
            participants: updatedParticipants,
            number_of_participants: selectedEvent.number_of_participants + 1,
          };

          //TODO fix this repeating code
          setSelectedEvent(updatedEvent);
          addParticipant(selectedEvent.id, user.name);
          
          // setSuccess(true);
          return { success: true };
        } else {
          return { success: false, message: `Error: ${response.statusText}` };
        }
      } catch (error) {
        console.error("Error adding participant:", error);
        return { success: false, message: 'Error! Possibly server limit reached. Try again tomorrow.' };
      }
    } else {
      return { success: false, message: 'Sorry, this event is full.' };
    }
  };


  const handleCancelParticipation = async () => {
    try {
      const response = await fetch(googleSheetURL, {
        // redirect: "follow",
        method: 'POST',
        // headers: {
        //   "Content-Type": "text/plain;charset=utf-8",
        // },
        body: JSON.stringify({
          eventId: selectedEvent.id,
          participantName: user.name,
          eventDate: selectedEvent.start.split('T')[0],
          action: "remove"
        }),
      });

      if (response.status === 200) {
        handleUserBooking("remove");
        let participantsArray = selectedEvent.participants.split(', ');
        let updatedParticipants = participantsArray.filter(name => name !== user.name)
        updatedParticipants = updatedParticipants.join(', ')

        const updatedEvent = {
          ...selectedEvent,
          participants: updatedParticipants,
          number_of_participants: selectedEvent.number_of_participants - 1,
        };

        //TODO remove repeating code
        setSelectedEvent(updatedEvent);
        removeParticipant(updatedEvent);

        return { success: true };
      } else {
        return { success: false, message: `Error: ${response.statusText}` };
      }
    } catch (error) {
      console.error("Error canceling participation:", error);
      return { success: false, message: 'Error! Please try again later.' };
    }
  };

  const handleUpdateEvent = async (updatedEvent) => {
    try {
      const response = await fetch(googleSheetURL, {
        redirect: "follow",
        method: 'POST',
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify({
          eventId: selectedEvent.id,
          participantName: selectedEvent.participantName,
          eventDate: selectedEvent.start.split('T')[0],
          ...updatedEvent,
          action: "edit"
        }),

      });
      if (response.status === 200) {
        setSelectedEvent(updatedEvent);        
        return { success: true };

      } else {
        return { success: false, message: `Error: ${response.statusText}` };
      }
    } catch (error) {
      console.error("Error canceling participation:", error);
      return { success: false, message: 'Error! Please try again later.' };
    }
  };

  function renderEventContent(eventInfo) {
    return (
      <div>
        <b>{eventInfo.timeText}</b>
        <div style={{ fontSize: '11px'}}> 
          {eventInfo.event.title}
        </div>
      </div>
    )
  }



  // if (isFetching) {
  //   return <div>Loading events...</div>;
  // }

  return (
    <div className="app-container">
      <Header />
      <div className="home-container">
        <div className="content-container">
          <div className="single-content-container">
            {isFetching ? (<h2 style={{ color: 'blue',textAlign: 'center' }}>
    Loading Events...
  </h2>) : <h2>Club Schedule</h2>}
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              events={events.map(event => {
                const isFull = event.number_of_participants >= event.maxParticipants;
                const maxParticipants = event.maxParticipants;
                return {
                  id: event.id,
                  title: `${event.title} \n (Spots Available: ${maxParticipants - event.number_of_participants}/${maxParticipants})`,
                  start: event.start,
                  end: event.end,
                  extendedProps: {
                    participants: event.participants
                  },
                  backgroundColor: isFull ? 'grey' : undefined, // Change color to grey if full
                }
              })}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
              }}
              eventClick={handleEventClick}
              editable={true}
              selectable={true}
              slotMinTime="09:00:00"
              slotMaxTime="24:00:00"
              eventContent={renderEventContent}
            />
            {selectedEvent && <EventRegistrationModal
              show={modalIsOpen}
              handleClose={() => setModalIsOpen(false)}
              selectedEvent={selectedEvent}
              handleParticipate={handleParticipate}
              handleCancelParticipation={handleCancelParticipation}
              handleUpdateEvent={handleUpdateEvent}
              user={user}
            />}


          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ClubSchedule;
