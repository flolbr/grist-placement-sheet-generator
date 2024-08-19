import VueHtmlToPaper from 'vue-html-to-paper';

const defaultOptions = {
    name: '_blank',
    specs: [
        'fullscreen=yes',
        'titlebar=yes',
        'scrollbars=yes'
    ],
    styles: [
        // 'https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css',
        // Add more styles if needed
    ]
}

export default {
    // install(app) {
    //     app.config.globalProperties.$htmlToPaper = (el, customOptions) => {
    //         return VueHtmlToPaper(el, customOptions || options);
    //     }
    // }
    install(Vue, Options) {
        console.log(Vue, Options);
        const Vue2 = {
            prototype: Vue.config.globalProperties
        };
        VueHtmlToPaper.install(Vue2, defaultOptions || Options);
    }
};
