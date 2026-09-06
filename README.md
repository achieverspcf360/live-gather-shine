# Live Giving Display

Build a SaaS Application: Live Giving & Prayer Display Platform



Project Overview



Build a modern, scalable Software-as-a-Service (SaaS) platform called Live Giving & Prayer Display.



This platform is designed for:



- Churches

- Non-profit organizations

- Political organizations (where legally permitted)

- Schools

- Fundraising campaigns

- Associations

- Conferences

- Event organizers



The purpose of the application is to allow attendees to submit their information, donations, and messages from their phones, while displaying approved submissions live on a projector, TV, or LED screen in real time.



---



Technology Stack



Use the following technologies:



- Flutter (Android, iOS, Web, Windows)

- Firebase Authentication

- Cloud Firestore

- Firebase Cloud Functions

- Firebase Storage

- Firebase Cloud Messaging

- Clean Architecture

- Provider or Riverpod for state management

- Material 3 UI

- Dark and Light themes

- Responsive design



---



User Roles



Create the following roles:



1. Super Admin

2. Organization Admin

3. Moderator

4. Cashier (optional)

5. Participant



---



Authentication



Support:



- Email & Password

- Google Sign-In

- Phone Number Login



Each organization should have its own isolated data.



No organization should see another organization's information.



---



Organization Module



Each organization can:



- Create an account

- Upload logo

- Organization name

- Description

- Address

- Contact information

- Payment methods

- Theme colors



---



Event Module



Each organization can create unlimited events.



Example:



Sunday Service



Building Fund



Convention 2027



Youth Conference



Political Rally



Charity Dinner



Each event should have:



- Event title

- Description

- Date

- Start time

- End time

- Banner image

- QR Code

- Unique Event Link

- Fundraising Goal

- Currency

- Projection Theme



---



Participant Submission



Participants open the event link or scan the QR code.



The form should collect:



- Full Name

- Organization Name (Optional)

- Group Name (Optional)

- Phone Number (Optional)

- Email (Optional)

- Donation Amount

- Currency

- Prayer Request

- Thanksgiving Message

- Support Message

- Anonymous Toggle



The participant clicks Submit.



---



Payment Module



Support multiple payment methods.



Examples:



- Mobile Money

- Card Payment

- Bank Transfer

- Cash Entry by Cashier



After successful payment:



Automatically create a donation record.



---



Real-Time Dashboard



The dashboard should update instantly without refreshing.



Display:



- Name

- Amount

- Prayer Request

- Thanksgiving Message

- Time

- Status

- Payment Method



Allow searching and filtering.



---



Projection Screen



Create a full-screen presentation mode.



This screen will be projected onto TVs and projectors.



Features:



- Automatic live updates

- Smooth animations

- Auto scrolling

- Beautiful transitions

- Full-screen mode

- Organization logo

- Event banner

- Current fundraising total

- Progress bar

- Live donation ticker



Every approved submission should instantly appear on the screen.



---



Moderation



Organization Admins should be able to:



Approve submissions



Reject submissions



Edit submissions



Delete submissions



Hide inappropriate messages



Pin important messages



Feature important donors



---



Analytics



Provide charts for:



Total donations



Daily donations



Weekly donations



Monthly donations



Top donors



Number of submissions



Prayer requests



Thanksgiving messages



Export reports to:



PDF



Excel



CSV



---



Notifications



Send notifications when:



A donation is received



A prayer request is submitted



A fundraising goal is reached



An event starts



---



Database Design



Create optimized Firestore collections for:



organizations



users



events



participants



donations



payments



messages



prayer_requests



thanksgiving



notifications



settings



roles



logs



---



Security



Implement Firebase Security Rules.



Ensure:



Organizations cannot access another organization's data.



Only moderators can approve submissions.



Only admins can edit events.



Protect all sensitive operations.



---



UI Design



Create a premium modern interface.



Include:



Beautiful cards



Glassmorphism where appropriate



Smooth animations



Professional typography



Responsive layouts



Dark Mode



Light Mode



Accessibility support



---



Future Features



Design the architecture so it can later support:



Live chat during events



AI moderation for messages



Multiple languages



Live streaming integration



SMS notifications



Email campaigns



Attendance tracking



Volunteer management



Membership management



Recurring donations



Subscription billing for organizations



Digital receipts



Sponsor advertisements



Live polls



Voting system



LED display mode



Public API



Webhooks



Offline mode



---



Expected Output



Generate:



1. Complete Flutter project structure.



2. Firestore database schema.



3. Authentication system.



4. Admin Dashboard.



5. Participant interface.



6. Projection Screen.



7. Firebase backend.



8. Responsive UI.



9. Clean Architecture.



10. Well-documented code.



The application should be production-ready, scalable, secure, and capable of supporting thousands of simultaneous users with real-time updates.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/fe9d7a9d-b81e-4c6e-8f05-71b361d8fc67).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
