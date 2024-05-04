# AWS Room Booking Service

https://dev.d1vsdcfra5yqf8.amplifyapp.com/

The AWS Room Booking Project, sponsored by Amazon Web Services (AWS), tackles a major issue of the return to in-person work, finding free physical spaces of the right size for employee meetings. Our task is to create a meeting room booking system for AWS to reduce the stress of booking meeting rooms at AWS and enhance the work life of their employees.

## Login
The first step of accessing our project is logging in. Your administrator must add you as a user in the Manage Users page and once that has been done, you will receive a temporary password to login. From there, you can create your own permanent password and access the site. 

Password can be reset from the login page by clicking “Forgot Password?”.

Once logged in, you can log out by clicking in the top-right corner of the screen and pressing “Logout”.

## Booking a Meeting

Booking a meeting is composed of three steps.
1. Select participants, date, room facilities, and number of rooms (groups)
  - Participants automatically include you
  - Room facilities will be automatically enabled for meetings in multiple rooms
  - Number of rooms must be at least the number of unique cities of the participants
2. Select timeslot (start time) and duration of your meeting
  - Timeslots are from 8:00 am - 7:00 pm
3. Select a room for each group and enter your meeting title
  - For multiple rooms, participants will be split into groups that optimally minimize the average travel distance for each participant.
  - Expand the table for each group to see its recommended rooms
  - Toggling “Show all rooms” will show rooms that are non-optimal, unavailable, or deactivated

https://github.com/siddh1311/AWSRoomBooking/assets/84104206/c7666a6c-427a-4d10-9e9f-4ebe02bcb376

https://github.com/siddh1311/AWSRoomBooking/assets/84104206/9fd93a7e-3fed-4450-b98c-902da9088e24

## Managing Bookings
A page to view, delete, and edit your bookings.
### Bookings Tables
The page contains two tables, one for bookings you have created, where you can edit and delete, and one for meetings you have been invited to by another user.
- For each meeting, click the expand table button to see the rooms booked and participants assigned to those rooms
- You can sort on the various headers of the table, by default, date is sorted.

### Delete
Click the delete button next to a meeting, then confirm “OK” to delete a meeting.

### Edit
Click the edit button to go through the meeting booking flow again. You can cancel editing at any time by clicking “Cancel Edit”.

https://github.com/siddh1311/AWSRoomBooking/assets/84104206/80cc7f83-b6ec-4428-af75-9abe9bf822a4

https://github.com/siddh1311/AWSRoomBooking/assets/84104206/57fb9b58-85ac-4a75-9e3d-fc227ea4c819

## Manage Rooms
A page to view your rooms. There are sort, filter, and search capabilities for the row headers.
### Add Room
Clicking the “Add Room” will bring up a form to specify room details. Once mandatory fields are filled out, click “Submit”
Adding a building can be done in this form as well, by specifying longitude and latitude of the building.

### Edit Room
Clicking “Edit” on a room will bring up a form similar to “Add Room”. Here you can edit the room’s fields and save.

### Deactivate/Activate Room
Under the “Edit” button, there is a deactivate/activate room button that will affect whether the room is bookable or not. 
Note: Any meetings booked with this room will be canceled until rebooked or the room is reactivated.

### Import Rooms (.csv)
Click “Import Rooms” and upload your .csv file to import rooms.

https://github.com/siddh1311/AWSRoomBooking/assets/84104206/550aee59-bfd6-4517-a596-a50e3802a7d7

## Manage Users
A page to view your users. There are sort, filter, and search capabilities for the row headers.
### Add User
Click “Add User” to bring up a form with the user’s details. Click “Add User” at the bottom of the form to submit after filling out mandatory fields. 

### Edit User
Click “Edit” on a user to edit the user, and save to confirm the changes made. 
Note: you can change a user’s role here to give them admin privileges.

### Deactivate/Activate User
The deactivate/activate buttons can be found inside the edit user form. Deactivated users will no longer be able to log in.

### Import Users (.csv)
Similar to importing rooms, click “Import Users” and upload your .csv file to import users.

https://github.com/siddh1311/AWSRoomBooking/assets/84104206/6d82d8ef-8cc4-413b-a3f9-e18ad49e8ccf

<br>
<br>

Copyright (c) 2024, HexedSolutions 🪄
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

Redistributions of source code must retain the above copyright notice,
this list of conditions and the following disclaimer.

Redistributions in binary form must reproduce the above copyright notice,
this list of conditions and the following disclaimer in the documentation
and/or other materials provided with the distribution.

Neither the name of the copyright holder nor the names of its
contributors may be used to endorse or promote products derived from
this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
