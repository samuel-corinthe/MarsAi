import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import CountdownTimer from "../components/CountdownTimer.jsx";

// petite fonction pratique
// ca evite de reecrire 100 fois screen getByTestId time
function getTimeEl() {
  return screen.getByTestId("time");
}

// fonction pour avancer le temps dans le test
// en gros on accelere le temps sans attendre en vrai
// 1000ms ca veut dire 1 seconde
async function advance(ms) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

describe("CountdownTimer", () => {
  beforeEach(() => {
    // ici on dit au test
    // stop le vrai temps
    // on veut controler le temps nous meme
    vi.useFakeTimers();
  });

  afterEach(() => {
    // ici on nettoie tout a la fin de chaque test
    // sinon un test peux casser les autres
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("affiche le temps initial (MM:SS)", () => {
    // on affiche le composant avec 90 secondes
    // 90 secondes ca fait 01 30
    render(<CountdownTimer initialSeconds={90} />);

    // on verifie que le texte a l ecran est bien 01:30
    expect(getTimeEl()).toHaveTextContent("01:30");
  });

  it("decremente chaque seconde quand on demarre", async () => {
    // on affiche le composant avec 5 secondes
    render(<CountdownTimer initialSeconds={5} />);

    // on clique sur start comme un humain
    fireEvent.click(screen.getByRole("button", { name: /start/i }));

    // on avance le temps de 1 seconde
    await advance(1000);

    // donc 5 devient 4
    expect(getTimeEl()).toHaveTextContent("00:04");

    // on avance le temps de 2 secondes
    await advance(2000);

    // donc 4 devient 2
    expect(getTimeEl()).toHaveTextContent("00:02");
  });

  it("pause stop la descente du temps", async () => {
    // on met 5 secondes
    render(<CountdownTimer initialSeconds={5} />);

    // on demarre
    fireEvent.click(screen.getByRole("button", { name: /start/i }));

    // on attend 1 seconde virtuelle
    await advance(1000);
    expect(getTimeEl()).toHaveTextContent("00:04");

    // on pause
    fireEvent.click(screen.getByRole("button", { name: /pause/i }));

    // on avance 2 secondes virtuelles
    // mais ca doit pas bouger car pause
    await advance(2000);

    // ca doit rester a 4
    expect(getTimeEl()).toHaveTextContent("00:04");
  });

  it("ne descend jamais sous 00:00", async () => {
    // on met 1 seconde
    render(<CountdownTimer initialSeconds={1} />);

    // on start
    fireEvent.click(screen.getByRole("button", { name: /start/i }));

    // on avance 1 seconde virtuelle
    await advance(1000);

    // la ca doit etre a zero
    expect(getTimeEl()).toHaveTextContent("00:00");

    // meme si on avance 5 secondes encore
    // ca doit rester a zero
    await advance(5000);
    expect(getTimeEl()).toHaveTextContent("00:00");
  });

  it("onComplete se lance 1 seule fois a la fin", async () => {
    // vi.fn c est une fausse fonction pour compter combien de fois elle est appellé
    const onComplete = vi.fn();

    // on met 2 secondes et on passe onComplete au composant
    render(<CountdownTimer initialSeconds={2} onComplete={onComplete} />);

    // on start
    fireEvent.click(screen.getByRole("button", { name: /start/i }));

    // on avance 2 secondes
    await advance(2000);

    // normalement on est a zero
    expect(getTimeEl()).toHaveTextContent("00:00");

    // on avance encore 5 secondes
    // mais onComplete doit pas se relancer 10 fois
    await advance(5000);

    // donc ca doit etre exactement 1 appel
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("reset remet le temps initial", async () => {
    // on met 10 secondes
    render(<CountdownTimer initialSeconds={10} />);

    // start
    fireEvent.click(screen.getByRole("button", { name: /start/i }));

    // on avance 3 secondes
    await advance(3000);

    // donc 10 devient 7
    expect(getTimeEl()).toHaveTextContent("00:07");

    // reset
    fireEvent.click(screen.getByRole("button", { name: /reset/i }));

    // reset doit remettre au debut
    expect(getTimeEl()).toHaveTextContent("00:10");
  });
});
/*Le timer en prod utilise le vrai temps normal
Les tests eux accélèrent le temps pour pas attendre
Ton code ne doit pas gérer les fake timers
Tu dois juste faire un timer propre avec setInterval
décrémenter chaque seconde
s’arrêter à 0
appeler onComplete une seule fois
nettoyer l’interval
Si le test passe le vrai timer marchera aussi
Si ça bloque c’est qu’il y a une erreur de logique*/