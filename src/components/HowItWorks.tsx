import { CheckCircle2 } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Submit Your Request",
    description: "Fill out a simple form with your game details, date, time, and level of play.",
  },
  {
    number: "02",
    title: "Instant Matching",
    description: "Our system automatically matches your request with qualified, available umpires.",
  },
  {
    number: "03",
    title: "Confirmation & Updates",
    description: "Receive instant confirmation and automated reminders as game day approaches.",
  },
  {
    number: "04",
    title: "Game Day Ready",
    description: "Professional umpires arrive prepared, ensuring your game runs smoothly.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            How It Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Getting started is simple. Follow these four easy steps to schedule your umpires.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="space-y-8">
            {steps.map((step, index) => (
              <div key={index} className="flex gap-6 items-start group">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-bold text-xl border-2 border-secondary group-hover:scale-110 transition-transform duration-300">
                    {step.number}
                  </div>
                </div>
                <div className="flex-1 pt-2">
                  <h3 className="text-2xl font-semibold text-foreground mb-2 flex items-center gap-2">
                    {step.title}
                    <CheckCircle2 className="h-5 w-5 text-secondary" />
                  </h3>
                  <p className="text-lg text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
