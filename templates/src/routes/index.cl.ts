import {
  reactive,
  div, h1, p, button, h2, ul, li, style, a
} from '@fracipolla/clarity'

// src/routes/welcome.cl.ts

// Define reactive styles
reactive style = {
  body: {
    margin: "0",
    padding: "0",
    fontFamily: "Arial, sans-serif",
    backgroundColor: "#f0f4f8",
    color: "#333",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    textAlign: "center"
  },
  header: {
    fontSize: "3rem",
    fontWeight: "bold",
    marginBottom: "1rem",
    color: "#1e3a8a"
  },
  subheader: {
    fontSize: "1.5rem",
    marginBottom: "2rem",
    color: "#475569"
  },
  button: {
    padding: "0.75rem 1.5rem",
    backgroundColor: "#1e3a8a",
    color: "#fff",
    border: "none",
    borderRadius: "0.5rem",
    cursor: "pointer",
    fontSize: "1rem",
    margin: "0.5rem",
    transition: "background-color 0.3s"
  },
  buttonHover: {
    backgroundColor: "#3b82f6"
  },
  link: {
    color: "#1e3a8a",
    textDecoration: "none",
    fontWeight: "bold"
  }
};

// Create reactive hover state for button
reactive hover = false;

// Helper to apply hover effect
function getButtonStyle() {
  return hover ? { ...style.button, ...style.buttonHover } : style.button;
}

// Build the welcome page
export default div({ style: style.body },
  h1({ style: style.header }, "Benvenuto in Clarity!"),
  p({ style: style.subheader }, "Un framework reattivo leggero per costruire interfacce dinamiche."),
  
  div({},
    button(
      { 
        style: getButtonStyle(),
        onmouseover: () => hover = true,
        onmouseout: () => hover = false,
        onclick: () => alert("Hai cliccato il pulsante!")
      },
      "Cliccami"
    ),
    button(
      {
        style: getButtonStyle(),
        onmouseover: () => hover = true,
        onmouseout: () => hover = false,
        onclick: () => alert("Benvenuto in Clarity!")
      },
      "Info"
    )
  ),

  p({ style: style.subheader }, 
    "Visita il ", 
    a({ href: "https://github.com/FraCipolla/clarity", style: style.link }, "repository Clarity")
  )
);

