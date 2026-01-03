import React from 'react';

const TestimonialsSection: React.FC = () => {
    const testimonials = [
        {
            name: 'Sarah Johnson',
            role: 'Golden Retriever Breeder',
            image: 'https://i.pravatar.cc/150?img=1',
            content: 'Petdegree has transformed how I manage my breeding program. The digital pedigree system is incredibly Professional and easy to use. My clients love the transparency!',
            rating: 5,
            location: 'California, USA'
        },
        {
            name: 'Michael Chen',
            role: 'Persian Cat Breeder',
            image: 'https://i.pravatar.cc/150?img=13',
            content: 'As a professional breeder for 15 years, I\'ve tried many systems. This is hands down the best. The health tracking features alone have saved me countless hours.',
            rating: 5,
            location: 'Singapore'
        },
        {
            name: 'Emma Williams',
            role: 'French Bulldog Specialist',
            image: 'https://i.pravatar.cc/150?img=5',
            content: 'The marketplace integration is brilliant. I can showcase my puppies and sell products all in one place. Customer support is outstanding too!',
            rating: 5,
            location: 'London, UK'
        }
    ];

    return (
        <section className="py-20 lg:py-28 bg-gradient-to-b from-background to-muted/30 relative overflow-hidden">
            {/* Decorative Background */}
            <div className="absolute inset-0 overflow-hidden opacity-30">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                {/* Section Header */}
                <div className="text-center mb-16">
                    <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4 animate-in fade-in zoom-in duration-500">
                        Testimonials
                    </span>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                        Loved by Breeders Worldwide
                    </h2>
                    <p className="text-lg text-foreground/60 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                        Join thousands of professional breeders who trust Petdegree to manage their breeding programs.
                    </p>
                </div>

                {/* Testimonials Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {testimonials.map((testimonial, index) => (
                        <div
                            key={index}
                            className="group bg-white/70 backdrop-blur-sm rounded-3xl p-8 border border-primary/10 hover:border-primary/30 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2 animate-in fade-in slide-in-from-bottom-8 fill-mode-both"
                            style={{ animationDelay: `${300 + index * 100}ms` }}
                        >
                            {/* Stars */}
                            <div className="flex gap-1 mb-4">
                                {[...Array(testimonial.rating)].map((_, idx) => (
                                    <svg
                                        key={idx}
                                        className="w-5 h-5 text-yellow-400 fill-current"
                                        viewBox="0 0 20 20"
                                    >
                                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                                    </svg>
                                ))}
                            </div>

                            {/* Content */}
                            <p className="text-foreground/70 leading-relaxed mb-6 italic">
                                "{testimonial.content}"
                            </p>

                            {/* Author */}
                            <div className="flex items-center gap-4 pt-6 border-t border-primary/10">
                                <img
                                    src={testimonial.image}
                                    alt={testimonial.name}
                                    className="w-14 h-14 rounded-full border-2 border-primary/20 group-hover:border-primary transition-colors"
                                />
                                <div>
                                    <h4 className="font-bold text-foreground">{testimonial.name}</h4>
                                    <p className="text-sm text-foreground/60">{testimonial.role}</p>
                                    <p className="text-xs text-primary mt-1 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        {testimonial.location}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Trust Badges */}
                <div className="mt-16 flex flex-wrap justify-center items-center gap-12 opacity-50">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-foreground">4.9/5.0</div>
                        <div className="text-sm text-foreground/60">Average Rating</div>
                    </div>
                    <div className="w-px h-12 bg-foreground/20" />
                    <div className="text-center">
                        <div className="text-2xl font-bold text-foreground">10,000+</div>
                        <div className="text-sm text-foreground/60">Happy Users</div>
                    </div>
                    <div className="w-px h-12 bg-foreground/20" />
                    <div className="text-center">
                        <div className="text-2xl font-bold text-foreground">98%</div>
                        <div className="text-sm text-foreground/60">Satisfaction Rate</div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default TestimonialsSection;
