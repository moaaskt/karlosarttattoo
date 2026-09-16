# Testing

Currently, there are no formal testing frameworks (like Vitest, Jest, or Playwright) set up in the `package.json`. 
Validation of the app is likely done manually during development.

## Recommendations for Future
- **Unit Testing**: Add Vitest and React Testing Library for testing pure functions and individual UI components.
- **E2E Testing**: Add Playwright to test the critical user flow (the booking form submission and the GSAP animations).
