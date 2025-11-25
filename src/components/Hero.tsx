import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, Users } from "lucide-react";
import heroImage from "@/assets/hero-umpire.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.7)), url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Streamline Your Baseball Umpire Scheduling
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-8 leading-relaxed">
            Connect teams with professional umpires effortlessly. Manage requests, scheduling, and assignments all in one powerful platform.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button size="lg" className="bg-secondary hover:bg-secondary/90 text-white text-lg px-8 py-6">
              Request an Umpire
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

          </div>

          <div className="flex flex-col sm:flex-row gap-8 justify-center items-center text-white/80">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span>Trusted by 500+ teams</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <span>10,000+ games scheduled</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
