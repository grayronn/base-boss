import { Calendar, Clock, Users, Shield, Bell, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Calendar,
    title: "Easy Scheduling",
    description: "Request umpires for your games with just a few clicks. Select date, time, and game level.",
  },
  {
    icon: Users,
    title: "Qualified Umpires",
    description: "Access a network of certified, experienced umpires ready to officiate your games.",
  },
  {
    icon: Clock,
    title: "Real-Time Updates",
    description: "Get instant notifications when umpires accept assignments or schedules change.",
  },
  {
    icon: Shield,
    title: "Reliable Coverage",
    description: "Never worry about no-shows. Our backup system ensures your games are always covered.",
  },
  {
    icon: Bell,
    title: "Automated Reminders",
    description: "Automatic notifications keep everyone informed about upcoming assignments.",
  },
  {
    icon: TrendingUp,
    title: "Performance Tracking",
    description: "Track umpire performance and maintain quality standards across all games.",
  },
];

const Features = () => {
  return (
    <section id="features" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Everything You Need
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed to make umpire scheduling simple and efficient for everyone involved.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="border-border hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
