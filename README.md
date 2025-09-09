# openTournaments

Welcome to the openTournaments project! This repository uses React + Vite for rapid development and modern tooling. Please read this guide carefully before contributing.

## Getting Started

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

### Official Plugins

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) (uses [Babel](https://babeljs.io/) for Fast Refresh)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) (uses [SWC](https://swc.rs/) for Fast Refresh)

## Contribution Guidelines

We welcome contributions! To maintain code quality and consistency, please follow these instructions:

### 1. Coding Standards

- **CSS Files:** Use lowercase kebab-case for all CSS filenames (e.g., `personal-dashboard.css`).
- **React Components:** Use PascalCase for ReactJS files inside `components` or any parent folder (e.g., `PersonalDashboard.js`).
- **Subfolders:** Use snake_case for all subfolder names (e.g., `index_classes`).

### 2. Linting & TypeScript

- For production applications, use TypeScript with type-aware lint rules enabled.
- Refer to the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for integrating TypeScript and [`typescript-eslint`](https://typescript-eslint.io).

### 3. Pull Request Instructions

- Ensure your code follows the naming conventions above.
- Write clear, descriptive commit messages.
- Document any new features or changes in the appropriate section of the README.
- Run all tests and ensure they pass before submitting your PR.
- If your change involves API requests or Postman collections, follow the instructions in the relevant files:
  - `/tmp/postman-collections-pre-request.instructions.md`
  - `/tmp/postman-collections-post-response.instructions.md`
  - `/tmp/postman-folder-pre-request.instructions.md`
  - `/tmp/postman-folder-post-response.instructions.md`
  - `/tmp/postman-http-request-pre-request.instructions.md`
  - `/tmp/postman-http-request-post-response.instructions.md`

### 4. Code Review

- All contributions will be reviewed for adherence to these guidelines.
- Feedback will be provided for any required changes.

## Naming Guidelines for CSS Classes, IDs, and Selectors

To ensure maintainability and scalability, follow these conventions:

### CSS Classes
- Use [BEM (Block Element Modifier)](http://getbem.com/) methodology for class names.
  - Example: `block__element--modifier`
  - Example: `dashboard__header--active`
- Use lowercase and hyphens (`-`) to separate words.
- Classes should be descriptive and reflect their purpose.

### CSS IDs
- Use only for unique elements (rarely needed in React projects).
- Use lowercase and hyphens (`-`) for IDs.
- Example: `main-header`, `user-profile-section`

### React Component Selectors
- Prefer classes over IDs for styling.
- Use BEM for classes in JSX.
- Avoid using global selectors; scope styles to components.

### JavaScript Variables for DOM Elements
- Use camelCase for variable names.
- Example: `userProfileSection`, `mainHeader`

### General Rules
- Avoid using generic names like `.container`, `.button` unless scoped within a block.
- Do not use IDs for styling unless absolutely necessary.
- Keep class names short but meaningful.
- Prefix utility/helper classes with `u-` (e.g., `u-text-center`).

---

**Example:**
```jsx
<div className="dashboard__header dashboard__header--active">
  <button className="dashboard__button u-text-center">Start</button>
</div>
```

---

By following these conventions, we ensure our codebase remains clean, scalable, and easy for all contributors

## License

This project is licensed under the MIT License.

---

Thank you for helping us build a better openTournaments!

